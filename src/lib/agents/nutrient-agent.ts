// src/lib/agents/nutrient-agent.ts
// PredictiveNutrientAgent — ML heuristic + auto-triggers DynamicReplannerAgent on HIGH risk

import { dbExecute } from '@/lib/fluxbase';
import { saveMemory } from './context';
import { runReplannerAgent } from './replanner-agent';
import type { AgentContext, AgentResult } from './types';
import type { ReplannerData } from './replanner-agent';

export interface NutrientRiskData {
  risk_level: 'Low' | 'Medium' | 'High';
  risk_probability: number;
  suggestion: string;
  trigger_replanner: boolean;
  replanner_result?: AgentResult<ReplannerData>;
}

interface SensorInput { n: number; p: number; k: number; moisture: number; temp: number; growth_rate: number; days_fert: number; }

/**
 * Heuristic nutrient risk model (replaces scikit-learn Random Forest).
 * Returns a risk score 0–100 and level (Low/Medium/High).
 *
 * Rules derived from agronomic research:
 * - Low N (<20) → high risk of nitrogen deficiency
 * - Low P (<10) → high risk of phosphorus deficiency  
 * - Low K (<30) → high risk of potassium deficiency
 * - High moisture (>70%) + high days_fert (>60) → disease risk
 * - High temp (>42°C) → heat stress risk
 */
function predictRisk(s: SensorInput): { probability: number; suggestion: string } {
  let score = 0;
  const flags: string[] = [];

  if (s.n < 20) { score += 30; flags.push('Critical N deficiency'); }
  else if (s.n < 35) { score += 15; flags.push('Low nitrogen'); }

  if (s.p < 10) { score += 25; flags.push('Critical P deficiency'); }
  else if (s.p < 20) { score += 10; flags.push('Low phosphorus'); }

  if (s.k < 30) { score += 20; flags.push('Critical K deficiency'); }
  else if (s.k < 50) { score += 8; flags.push('Low potassium'); }

  if (s.days_fert > 60) { score += 15; flags.push(`No fertilizer in ${s.days_fert} days`); }
  else if (s.days_fert > 40) { score += 7; }

  if (s.moisture > 75) { score += 10; flags.push('Waterlogging risk'); }
  else if (s.moisture < 15) { score += 12; flags.push('Drought stress'); }

  if (s.temp > 42) { score += 10; flags.push('Heat stress'); }

  if (s.growth_rate < 0.5) { score += 10; flags.push('Stunted growth'); }

  const probability = Math.min(100, score);

  let suggestion: string;
  if (probability >= 70) {
    suggestion = `CRITICAL: ${flags.join(', ')}. Immediate intervention required — apply balanced NPK, irrigate now.`;
  } else if (probability >= 40) {
    suggestion = `WARNING: ${flags.join(', ')}. Apply corrective fertilizer within 48 hours.`;
  } else {
    suggestion = flags.length ? `Monitor: ${flags.join(', ')}. Schedule fertilization.` : 'Soil health looks good. Continue routine monitoring.';
  }

  return { probability, suggestion };
}

export async function runNutrientAgent(
  ctx: AgentContext,
  input: SensorInput
): Promise<AgentResult<NutrientRiskData>> {
  const trace: string[] = [];
  const { farmerId, planId } = ctx;

  // ── Step 1: Run prediction model ──
  trace.push('Step 1: Running predictive nutrient risk model...');
  const { probability, suggestion } = predictRisk(input);

  let risk_level: 'Low' | 'Medium' | 'High';
  if (probability >= 70) risk_level = 'High';
  else if (probability >= 40) risk_level = 'Medium';
  else risk_level = 'Low';

  trace.push(`Step 1 ✓: Risk level = ${risk_level} (${probability}%)`);

  // ── Step 2: Log to nutrient_risk_log ──
  trace.push('Step 2: Logging risk assessment to database...');
  if (farmerId) {
    void dbExecute(
      'INSERT INTO nutrient_risk_log (farmer_id, plan_id, risk_probability, risk_level, suggested_action) VALUES (?, ?, ?, ?, ?)',
      [farmerId, planId || null, probability, risk_level, suggestion]
    );
    void saveMemory(farmerId, 'nutrient-risk', `${risk_level} risk (${probability}%). ${suggestion.slice(0, 80)}`);
  }
  trace.push('Step 2 ✓: Risk logged to database.');

  let trigger_replanner = false;
  let replanner_result: AgentResult<ReplannerData> | undefined;

  // ── Step 3: Autonomously trigger Replanner if HIGH risk ──
  if (risk_level === 'High') {
    trace.push('Step 3: HIGH risk detected → autonomously triggering DynamicReplannerAgent...');
    trigger_replanner = true;
    replanner_result = await runReplannerAgent(ctx, {
      risk_level,
      risk_probability: probability,
      suggestion,
      n: input.n,
      p: input.p,
      k: input.k,
    });
    trace.push(`Step 3 ✓: Replanner completed — ${replanner_result.data?.status}`);
    if (replanner_result.trace) trace.push(...replanner_result.trace.map((t) => `  [Replanner] ${t}`));
  } else {
    trace.push('Step 3: Risk level is not High — no autonomous replanning needed.');
  }

  return {
    success: true,
    data: { risk_level, risk_probability: probability, suggestion, trigger_replanner, replanner_result },
    trace,
    triggered: trigger_replanner ? 'replanner-agent' : undefined,
  };
}
