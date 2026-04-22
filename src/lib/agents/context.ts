// src/lib/agents/context.ts
// Builds and caches the AgentContext — shared memory injected into every agent

import { dbExecute } from '@/lib/fluxbase';
import type { AgentContext, AgentMemory, FarmerProfile } from './types';

/**
 * Build a full AgentContext for a request.
 * Fetches the farmer profile and last 5 agent interactions from the DB.
 */
export async function buildContext(
  userId: number,
  farmerId?: number,
  planId?: number
): Promise<AgentContext> {
  const ctx: AgentContext = { userId, farmerId, planId, conversationHistory: [] };

  if (!farmerId) return ctx;

  // Parallel fetch: profile + conversation history
  const [profileRows, historyRows] = await Promise.all([
    dbExecute('SELECT * FROM farmer_profile WHERE farmer_id = ? LIMIT 1', [farmerId]),
    dbExecute(
      'SELECT interaction_log, session_date FROM session_logs WHERE farmer_id = ? ORDER BY session_date DESC LIMIT 5',
      [farmerId]
    ),
  ]);

  if (profileRows[0]) {
    ctx.farmerProfile = profileRows[0] as unknown as FarmerProfile;
  }

  if (historyRows.length > 0) {
    ctx.conversationHistory = historyRows.map((r) => {
      try {
        return JSON.parse(r.interaction_log as string) as AgentMemory;
      } catch {
        return { agent: 'unknown', summary: String(r.interaction_log), timestamp: String(r.session_date) };
      }
    });
  }

  return ctx;
}

/**
 * Save an agent interaction to session_logs for future memory retrieval.
 */
export async function saveMemory(
  farmerId: number,
  agent: string,
  summary: string
): Promise<void> {
  const memory: AgentMemory = { agent, summary, timestamp: new Date().toISOString() };
  void dbExecute(
    'INSERT INTO session_logs (farmer_id, interaction_log) VALUES (?, ?)',
    [farmerId, JSON.stringify(memory)]
  );
}

/**
 * Format conversation history as a string to inject into AI prompts.
 */
export function formatMemory(history: AgentMemory[] | undefined): string {
  if (!history?.length) return 'No previous interactions.';
  return history
    .map((m) => `[${m.agent} @ ${m.timestamp.slice(0, 10)}]: ${m.summary}`)
    .join('\n');
}
