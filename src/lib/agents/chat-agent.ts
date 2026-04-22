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

const MAX_ITERATIONS = 6; // Safety cap — prevents infinite loops
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
8. "Remind me" → save_reminder.
9. Chain tools as needed; each tool only once unless allowed.
10. Synthesize a warm, practical answer after tool results.

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
      model: 'llama-3.1-8b-instant',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 600,
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
  onEvent?: (event: { type: 'thinking' | 'tool_start' | 'tool_done'; message: string }) => void
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

  const messages: object[] = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
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
  const MULTI_CALL_ALLOWED = new Set(['get_mandi_prices', 'diagnose_crop_disease', 'save_reminder']);

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

        void saveMemory(farmerId, 'agent-chat', memorySummary);
        // Log to top-level agent_memory table
        void logAgentAction({
          farmerId,
          agent: 'agent-chat',
          actionType: 'query',
          input: question.slice(0, 400),
          output: finalAnswer.slice(0, 800),
          toolsUsed,
        });
        void dbExecute(
          'INSERT INTO session_logs (farmer_id, interaction_log) VALUES (?, ?)',
          [farmerId, JSON.stringify({
            agent: 'agentic-chat',
            question: question.slice(0, 200),
            answer: finalAnswer.slice(0, 400),
            toolsUsed,
            timestamp: new Date().toISOString(),
          })]
        );
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

    for (const call of message.tool_calls) {
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
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `[Already retrieved — use the earlier ${toolName} result from above]`,
        });
        continue;
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
          (msg) => emit('thinking', msg)
        );
        emit('tool_done', `✅ ${toolResult.split('\n')[0]}`);
        trace.push(`  ← Tool result: ${toolResult.slice(0, 80)}...`);
      } catch (err) {
        toolResult = `Tool ${toolName} failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
        trace.push(`  ← Tool failed: ${toolResult}`);
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: toolResult,
      });
    }

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
