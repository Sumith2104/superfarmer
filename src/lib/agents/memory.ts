// src/lib/agents/memory.ts
// Top-level AI memory — logs every agent action persistently
// Fire-and-forget writes (void) so agents are never slowed down

import { dbExecute } from '@/lib/fluxbase';

export interface MemoryEntry {
  id: number;
  farmer_id: number;
  agent: string;
  action_type: string;
  input_text: string;
  output_text: string;
  tools_used: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

const AGENT_ICONS: Record<string, string> = {
  recommendation: '🌾',
  disease: '🔬',
  plan: '📋',
  weather: '🌤️',
  nutrient: '🧪',
  spatial: '🗺️',
  report: '📄',
  chat: '🤖',
  'agent-chat': '🤖',
  replanner: '🔄',
  email: '📧',
};

export function getAgentIcon(agent: string): string {
  return AGENT_ICONS[agent] ?? '🤖';
}

/** Log an AI agent action — fire and forget, never blocks the caller */
export async function logAgentAction(params: {
  farmerId: number;
  agent: string;
  actionType?: string;
  input: string;
  output: string;
  toolsUsed?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { farmerId, agent, actionType = 'query', input, output, toolsUsed = [], metadata = {} } = params;
    // Keep last 100 per farmer — prune oldest if needed
    const countRows = await dbExecute(
      'SELECT COUNT(*) as cnt FROM agent_memory WHERE farmer_id=?', [farmerId]
    );
    const count = (countRows[0]?.cnt as number) ?? 0;
    if (count >= 100) {
      await dbExecute(
        'DELETE FROM agent_memory WHERE farmer_id=? ORDER BY created_at ASC LIMIT 10',
        [farmerId]
      );
    }
    await dbExecute(
      `INSERT INTO agent_memory
        (farmer_id, agent, action_type, input_text, output_text, tools_used, metadata)
       VALUES (?,?,?,?,?,?,?)`,
      [
        farmerId, agent, actionType,
        input.slice(0, 500),
        output.slice(0, 1000),
        JSON.stringify(toolsUsed),
        JSON.stringify(metadata),
      ]
    );
  } catch {
    // Never throw — memory logging must never crash an agent
  }
}

/** Get recent agent memory for a farmer */
export async function getMemory(farmerId: number, limit = 20): Promise<MemoryEntry[]> {
  const rows = await dbExecute(
    'SELECT * FROM agent_memory WHERE farmer_id=? ORDER BY created_at DESC LIMIT ?',
    [farmerId, limit]
  );
  return rows.map(r => ({
    ...r,
    tools_used: (() => { try { return JSON.parse(r.tools_used as string); } catch { return []; } })(),
    metadata: (() => { try { return JSON.parse(r.metadata as string); } catch { return {}; } })(),
  })) as MemoryEntry[];
}

/** Get memory filtered by agent */
export async function getMemoryByAgent(farmerId: number, agent: string, limit = 10): Promise<MemoryEntry[]> {
  const rows = await dbExecute(
    'SELECT * FROM agent_memory WHERE farmer_id=? AND agent=? ORDER BY created_at DESC LIMIT ?',
    [farmerId, agent, limit]
  );
  return rows.map(r => ({
    ...r,
    tools_used: (() => { try { return JSON.parse(r.tools_used as string); } catch { return []; } })(),
    metadata: (() => { try { return JSON.parse(r.metadata as string); } catch { return {}; } })(),
  })) as MemoryEntry[];
}

/** Delete a single memory entry (only if it belongs to this farmer) */
export async function deleteMemory(id: number, farmerId: number): Promise<void> {
  await dbExecute('DELETE FROM agent_memory WHERE id=? AND farmer_id=?', [id, farmerId]);
}

/** Format memory as text for injection into AI prompts */
export function formatMemoryForPrompt(entries: MemoryEntry[]): string {
  if (!entries.length) return 'No previous AI actions recorded.';
  return entries.slice(0, 5).map(e =>
    `[${e.agent} @ ${e.created_at.slice(0, 10)}]: ${e.input_text.slice(0, 80)} → ${e.output_text.slice(0, 120)}`
  ).join('\n');
}
