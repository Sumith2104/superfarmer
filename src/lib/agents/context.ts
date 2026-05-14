// src/lib/agents/context.ts
// Builds the AgentContext — agent_memory is the single source of truth for all memory

import { dbExecute } from '@/lib/fluxbase';
import { logAgentAction, getMemoryByAgent, formatMemoryForPrompt } from './memory';
import type { AgentContext, AgentMemory, FarmerProfile } from './types';

export { logAgentAction, formatMemoryForPrompt };

/**
 * Build a full AgentContext for a request.
 * Reads farmer profile + last 10 agent_memory entries.
 */
export async function buildContext(
  userId: number,
  farmerId?: number,
  planId?: number
): Promise<AgentContext> {
  const ctx: AgentContext = { userId, farmerId, planId, conversationHistory: [] };
  if (!farmerId) return ctx;

  const [profileRows, memoryRows] = await Promise.all([
    dbExecute('SELECT * FROM farmer_profile WHERE farmer_id = ? LIMIT 1', [farmerId]),
    dbExecute(
      'SELECT agent, action_type, input_text, output_text, metadata, created_at FROM agent_memory WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10',
      [farmerId]
    ),
  ]);

  if (profileRows[0]) ctx.farmerProfile = profileRows[0] as unknown as FarmerProfile;

  if (memoryRows.length > 0) {
    ctx.conversationHistory = memoryRows.map((r) => ({
      agent: String(r.agent),
      summary: `[${r.action_type}] Q: ${String(r.input_text).slice(0, 80)} → A: ${String(r.output_text).slice(0, 120)}`,
      timestamp: String(r.created_at),
    } as AgentMemory));
  }

  return ctx;
}

/**
 * Save an agent interaction to agent_memory (replaces old session_logs saveMemory).
 * Fire-and-forget.
 */
export async function saveMemory(
  farmerId: number,
  agent: string,
  summary: string,
  input = '',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  void logAgentAction({
    farmerId,
    agent,
    actionType: 'summary',
    input: input || summary.slice(0, 120),
    output: summary,
    metadata,
  });
}

/**
 * Format conversation history as a string to inject into AI prompts.
 */
export function formatMemory(history: AgentMemory[] | undefined): string {
  if (!history?.length) return 'No previous interactions recorded.';
  return history
    .map((m) => `[${m.agent} @ ${m.timestamp?.slice(0, 10) ?? 'unknown'}]: ${m.summary}`)
    .join('\n');
}

/**
 * Get last N memories for a specific agent type (for agent self-retrieval).
 */
export async function getAgentMemory(farmerId: number, agent: string, limit = 5) {
  return getMemoryByAgent(farmerId, agent, limit);
}
