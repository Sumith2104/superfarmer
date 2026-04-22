// src/app/api/agent-chat/route.ts
// Streaming SSE endpoint for the Agentic AI chat.
// Emits real-time "thinking" events as the ReAct loop executes tools,
// then emits the final answer when done.

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runChatAgent } from '@/lib/agents/chat-agent';

export const maxDuration = 60; // Allow up to 60s for agentic loops

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return new Response(
      JSON.stringify({ error: 'Please login to use the AI assistant.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { question, imageBase64, conversationHistory } = await req.json();
  if (!question?.trim() && !imageBase64) {
    return new Response(
      JSON.stringify({ error: 'Please ask a question or attach an image.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const effectiveQuestion = question?.trim() || 'Please diagnose this crop image and tell me what disease or problem you see.';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: { type: string; message: string; toolsUsed?: string[] }) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream may be closed
        }
      }

      try {
        // Emit initial status
        emit({ type: 'thinking', message: '🧠 SuperFarmer AI is thinking...' });

        // Build farmer context
        const ctx = await buildContext(session.userId!, session.farmerId, session.planId);

        // If image is attached, prepend vision hint to the question
        const finalQuestion = imageBase64
          ? `${effectiveQuestion} [The farmer has attached a crop/leaf photo for visual analysis.]`
          : effectiveQuestion;

        // Run the ReAct orchestrator with streaming callbacks
        const result = await runChatAgent(
          ctx,
          finalQuestion,
          imageBase64 || undefined,
          conversationHistory || [],
          ({ type, message }) => {
            emit({ type, message });
          }
        );

        // Emit final answer
        if (result.success && result.data) {
          emit({
            type: 'answer',
            message: result.data.response,
            toolsUsed: result.data.toolsUsed,
          });
        } else {
          emit({
            type: 'error',
            message: result.error || 'Something went wrong. Please try again.',
          });
        }
      } catch (err) {
        emit({
          type: 'error',
          message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
