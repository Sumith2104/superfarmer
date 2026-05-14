// src/lib/agents/chat-agent.ts
// TRUE AGENTIC AI: ReAct (Reason + Act) orchestrator loop.
// The Groq LLM autonomously decides which tools to call, in what order,
// and loops until it has enough information to give a complete answer.

import { dbExecute } from '@/lib/fluxbase';
import { saveMemory } from './context';
import { logAgentAction } from './memory';
import { FARM_TOOLS } from './tools/registry';
import { executeTool } from './tools/executor';
import type { AgentContext, AgentResult } from './types';
import type { FarmToolName } from './tools/registry';

export interface ChatData {
  response: string;
  toolsUsed?: string[];
  thinkingSteps?: string[];
}

const MAX_ITERATIONS = 12; // Increased to allow more room for complex reasoning
const groqApiKey = process.env.GROQ_API_KEY || '';

const AGENT_SYSTEM_PROMPT = `You are SuperFarmer AI — an expert farming advisor for Indian farmers. Use tools to fetch real data; never invent facts.

Rules:
1. Greetings/simple questions → answer directly, no tools needed.
2. Any question about the farmer → call get_farmer_profile first.
3. "What to plant" → get_crop_recommendations.
4. Plant symptoms (spots, yellowing, wilting) → diagnose_crop_disease.
5. "My plan" / "what's next" → get_crop_plan.
6. "Farm status" / "full report" → generate_crop_report.
7. Price/mandi questions → get_mandi_prices.
8. Weather/irrigation timing → get_weather_forecast.
9. "Remind me" → save_reminder.
10. "Make a plan detailed" / "generate layout" / "spatial twin" → generate_spatial_twin.
11. IMPORTANT: Call MULTIPLE tools in parallel in a single response whenever possible (e.g. call profile, plan, and memory at the same time).
12. Chain tools as needed; each tool only once unless allowed.
13. Synthesize a warm, practical answer after tool results.
14. VERY IMPORTANT: If a tool returns Recommended Products with Amazon links, you MUST include those exact markdown links in your final response to the user!

Style: friendly, simple language, 1-2 actionable next steps.`;

// ─────────────────────────────────────────────────────────────
// Core Groq caller
// ─────────────────────────────────────────────────────────────
async function callGroq(messages: object[], tools: object[], retryOnRateLimit = true) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 800,
      temperature: 0.4,
    }),
  });

  if (res.status === 429 && retryOnRateLimit) {
    // Parse the suggested wait time from Groq's error body
    const errBody = await res.text();
    const waitMatch = errBody.match(/try again in ([\d.]+)s/i);
    const waitMs = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) + 500 : 10000;
    console.log(`[AgenticChat] Rate limited. Waiting ${waitMs}ms then retrying...`);
    await new Promise((r) => setTimeout(r, waitMs));
    return callGroq(messages, tools, false); // retry once
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// ReAct Orchestrator Loop
// ─────────────────────────────────────────────────────────────
export async function runChatAgent(
  ctx: AgentContext,
  question: string,
  imageBase64?: string,
  sessionHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  onEvent?: (event: { type: 'thinking' | 'tool_start' | 'tool_done' | 'tool_data'; message: string; data?: any }) => void
): Promise<AgentResult<ChatData>> {
  const trace: string[] = [];
  const toolsUsed: string[] = [];
  const thinkingSteps: string[] = [];
  const { farmerId } = ctx;

  const emit = (type: 'thinking' | 'tool_start' | 'tool_done', message: string) => {
    thinkingSteps.push(message);
    onEvent?.({ type, message });
  };

  // Store imageBase64 in context so executor can pass it to disease agent
  if (imageBase64) {
    (ctx as AgentContext & { imageBase64?: string }).imageBase64 = imageBase64;
  }

  // Build initial message thread — inject session history between system prompt and new question
  // This gives Groq full memory of everything said in this chat session
  const historyMessages = sessionHistory.slice(-6).map((m) => ({ // Keep last 6 turns to stay within token limits
    role: m.role,
    content: m.content,
  }));

  const langPref = ctx.farmerProfile?.preferred_lang || 'en';
  const langInstruction = langPref !== 'en' 
    ? `\n\nCRITICAL LANGUAGE INSTRUCTION: 
1. You MUST translate and write your FINAL RESPONSE exclusively in the language code: '${langPref}'. Do not use English script in the final answer, use the native script of '${langPref}'.
2. However, when calling ANY tools, you MUST pass all arguments in English! Translate the user's input to English internally before passing it into a tool's JSON arguments. Tool arguments must be in English.` 
    : '';

  const messages: object[] = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT + langInstruction },
    ...historyMessages,
    { role: 'user', content: imageBase64
      ? `${question}\n\n[A crop/leaf photo has been attached by the farmer. When calling diagnose_crop_disease, the image will be automatically used for visual analysis.]`
      : question
    },
  ];

  trace.push('Starting ReAct orchestrator loop...');
  // Track which tools have been called — prevent the same read-only tool being called twice
  const calledTools = new Set<string>();
  // Tools that are safe to call multiple times (e.g. price lookups with different args)
  const MULTI_CALL_ALLOWED = new Set(['get_mandi_prices', 'save_reminder']);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    trace.push(`Iteration ${iteration + 1}: Calling Groq orchestrator...`);

    let groqResponse;
    try {
      groqResponse = await callGroq(messages, FARM_TOOLS);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      trace.push(`Groq call failed: ${errMsg}`);
      console.error('[AgenticChat] Groq error:', errMsg);
      return {
        success: true,
        data: {
          response: `I ran into an issue with my AI engine: ${errMsg.slice(0, 100)}. Please try again.`,
          toolsUsed,
          thinkingSteps,
        },
        trace,
      };
    }

    const choice = groqResponse.choices?.[0];
    const message = choice?.message;

    // ── Terminal condition: no tool calls → AI has final answer ──
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      const finalAnswer = message?.content || 'I was unable to generate a response. Please try rephrasing.';
      trace.push(`Iteration ${iteration + 1}: Final answer reached (no tool calls).`);

      // ── Save rich cross-session memory to DB ──────────────────────────
      // This is what the get_agent_memory tool reads in FUTURE sessions
      // Store enough detail that the AI can recall what was actually discussed
      if (farmerId) {
        const memorySummary = [
          `Q: "${question.slice(0, 120)}"`,
          `A: "${finalAnswer.slice(0, 200)}"`,
          toolsUsed.length > 0 ? `Tools used: ${toolsUsed.join(', ')}` : null,
        ].filter(Boolean).join(' | ');

        // Log to top-level agent_memory table
        void logAgentAction({
          farmerId,
          agent: 'agent-chat',
          actionType: 'query',
          input: question.slice(0, 400),
          output: finalAnswer.slice(0, 800),
          toolsUsed,
        });
      }

      return {
        success: true,
        data: { response: finalAnswer, toolsUsed, thinkingSteps },
        trace,
      };
    }

    // ── Tool calls detected: execute them all ──
    messages.push({ role: 'assistant', ...message });

    trace.push(`Iteration ${iteration + 1}: ${message.tool_calls.length} tool call(s) requested.`);

    const toolPromises = message.tool_calls.map(async (call: any) => {
      const toolName = call.function.name as FarmToolName;
      let toolArgs: Record<string, string> = {};

      try {
        toolArgs = JSON.parse(call.function.arguments || '{}');
      } catch {
        toolArgs = {};
      }

      // ── Dedup: skip read-only tools that were already called this loop ──
      if (calledTools.has(toolName) && !MULTI_CALL_ALLOWED.has(toolName)) {
        trace.push(`  ⟳ Skipping duplicate call to ${toolName}`);
        return {
          role: 'tool',
          tool_call_id: call.id,
          content: `[Already retrieved — use the earlier ${toolName} result from above]`,
        };
      }
      calledTools.add(toolName);

      emit('tool_start', `🔧 Calling tool: ${toolName}...`);
      toolsUsed.push(toolName);
      trace.push(`  → Executing tool: ${toolName}(${JSON.stringify(toolArgs)})`);

      let toolResult: string;
      try {
        toolResult = await executeTool(
          toolName,
          toolArgs,
          ctx,
          (msg) => emit('thinking', msg),
          (data) => onEvent?.({ type: 'tool_data', message: '', data })
        );
        emit('tool_done', `✅ ${toolResult.split('\n')[0]}`);
        trace.push(`  ← Tool result: ${toolResult.slice(0, 80)}...`);
      } catch (err) {
        toolResult = `Tool ${toolName} failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
        trace.push(`  ← Tool failed: ${toolResult}`);
      }

      return {
        role: 'tool',
        tool_call_id: call.id,
        content: toolResult,
      };
    });

    const toolResults = await Promise.all(toolPromises);
    messages.push(...toolResults);

    // Continue loop — Groq reads tool results and decides next action
  }

  // Hit MAX_ITERATIONS without final answer
  trace.push('MAX_ITERATIONS reached without final answer.');
  return {
    success: true,
    data: {
      response: "I gathered a lot of information but ran out of time to synthesize it all. Here's what I found: please check your crop plan and profile pages for detailed information.",
      toolsUsed,
      thinkingSteps,
    },
    trace,
  };
}
