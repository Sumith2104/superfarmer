// src/lib/agents/intake-agent.ts
// IntakeAgent — handles farmer profile creation and initial context setup

import { dbExecute, dbLastInsertId } from '@/lib/fluxbase';
import { saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

export interface IntakeData {
  farmerId: number;
}

export async function runIntakeAgent(
  ctx: AgentContext,
  data: { name: string; land_size: string | number; location: string; water: string; goals: string }
): Promise<AgentResult<IntakeData>> {
  const trace: string[] = [];
  const { userId } = ctx;

  trace.push(`Step 1: Processing intake for user #${userId}...`);
  const acres = typeof data.land_size === 'string' ? parseFloat(data.land_size) || 0 : data.land_size;

  try {
    trace.push('Step 2: Saving farmer profile to Fluxbase database...');
    await dbExecute(
      'INSERT INTO farmer_profile (user_id, name, land_size, location, water_availability, farming_goals) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, data.name, acres, data.location, data.water, data.goals]
    );
    const farmerId = await dbLastInsertId();
    trace.push(`Step 2 ✓: Profile created with ID #${farmerId}`);

    // Initial memory entry
    void saveMemory(farmerId, 'intake', `Farmer profile created: ${data.name} in ${data.location} (${acres} acres). Goals: ${data.goals}`);

    return {
      success: true,
      data: { farmerId },
      trace,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Intake agent failed';
    trace.push(`Step 2 ✗: ${msg}`);
    return { success: false, error: msg, trace };
  }
}
