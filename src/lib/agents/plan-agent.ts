// src/lib/agents/plan-agent.ts
// PlanAgent — generates comprehensive crop management plans using farmer context and memory

import { getJsonModel, withTimeout } from '@/lib/gemini';
import { dbExecute, dbLastInsertId } from '@/lib/fluxbase';
import { saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

export interface PlanData {
  plan_id?: number;
  crop_name: string;
  sowing_schedule: string;
  irrigation_plan: string;
  fertilizer_schedule: string;
  pest_alerts: string;
  harvest_timeline: string;
  status: string;
}

const SYSTEM_INSTRUCTION = `You are an expert Agricultural Crop Planning Specialist advising Indian farmers.
Generate detailed, practical crop management plans based on the crop name.
All plans must be specific to Indian farming conditions, seasons, and locally available inputs.
Respond strictly with valid JSON.`;

const PLAN_FALLBACKS: Record<string, Partial<PlanData>> = {
  Rice:    { sowing_schedule: 'June–July (Kharif) after 20–25 days nursery', irrigation_plan: 'Continuous flooding 2–5cm for first 30 days, then intermittent', fertilizer_schedule: 'Basal: 40kg N + 20kg P + 20kg K/acre. Top dress: 20kg N at tillering, 20kg N at panicle initiation', pest_alerts: 'Monitor for Stem Borer (yellow moth), Brown Plant Hopper, Blast disease after rains', harvest_timeline: '120–150 days. Harvest at 80–85% grain maturity' },
  Wheat:   { sowing_schedule: 'Oct 15 – Nov 15 (Rabi). Sow at 100kg seed/acre, 22cm row spacing', irrigation_plan: 'Critical: Crown root initiation (21 DAS), Tillering (45 DAS), Jointing, Grain filling', fertilizer_schedule: 'Basal: 50kg DAP/acre. Top dress: 25kg Urea at 30 DAS, 25kg Urea at 60 DAS', pest_alerts: 'Monitor for aphids, Yellow rust (cool humid weather), Loose smut', harvest_timeline: '110–130 days. Harvest when moisture ≤14%' },
  Cotton:  { sowing_schedule: 'May–June after first monsoon rains. 1.5m × 60cm spacing', irrigation_plan: 'Every 10–15 days. Critical: Squaring → Boll formation. Avoid waterlogging', fertilizer_schedule: 'Basal: 20kg N + 20kg P + 20kg K. Split: 20kg N at 4 weeks, 20kg N at 8 weeks', pest_alerts: 'Bollworms (American/Spotted/Pink). Monitor with pheromone traps weekly', harvest_timeline: '150–180 days. Pick in 3–4 rounds as bolls open' },
};

function getFallbackPlan(cropName: string): PlanData {
  const key = Object.keys(PLAN_FALLBACKS).find(k => cropName.toLowerCase().includes(k.toLowerCase()));
  const p = key ? PLAN_FALLBACKS[key] : {
    sowing_schedule: 'Sow at beginning of appropriate season with certified seeds at recommended spacing.',
    irrigation_plan: 'Irrigate every 7–10 days. Adjust based on soil moisture and rainfall.',
    fertilizer_schedule: 'Apply NPK 19:19:19 as basal dose. Follow with Urea top dressing at 30 and 60 days.',
    pest_alerts: 'Scout weekly for pests and diseases. Contact local KVK for IPM advice.',
    harvest_timeline: 'Harvest at physiological maturity when crop shows typical maturity indicators.',
  };
  return { ...p, crop_name: cropName, status: 'Active' } as PlanData;
}

export async function runPlanAgent(
  ctx: AgentContext,
  cropName: string
): Promise<AgentResult<PlanData>> {
  const trace: string[] = [];
  const { farmerId, farmerProfile } = ctx;

  trace.push(`Step 1: Preparing to generate management plan for ${cropName}...`);
  
  const profileText = farmerProfile 
    ? `Location: ${farmerProfile.location}, Land: ${farmerProfile.land_size} acres, Goals: ${farmerProfile.farming_goals}`
    : 'Profile not available.';

  let plan: PlanData;
  try {
    trace.push('Step 2: Calling AI for localized crop plan generation...');
    const model = getJsonModel(SYSTEM_INSTRUCTION, { temperature: 0.2, maxTokens: 1000 });
    const userPrompt = `Create a detailed crop management plan for:
- Crop: ${cropName}
- Farmer Profile: ${profileText}

Return JSON:
{
  "sowing_schedule": "specific timing, seed rate, row spacing",
  "irrigation_plan": "frequency, quantity, critical stages to irrigate",
  "fertilizer_schedule": "NPK doses with timing (DAS = days after sowing)",
  "pest_alerts": "top 2-3 pests/diseases to watch, early warning signs",
  "harvest_timeline": "days to harvest, maturity indicators, post-harvest tips"
}`;

    const result = await withTimeout(model.generateContent(userPrompt));
    const data = JSON.parse(result.response.text());
    plan = { ...data, crop_name: cropName, status: 'Active' };
    trace.push(`Step 2 ✓: AI generated plan for ${cropName}.`);
  } catch (err) {
    trace.push('Step 2 !: AI generation failed, using fallback plan.');
    plan = getFallbackPlan(cropName);
  }

  // Persist to DB
  if (farmerId) {
    trace.push('Step 3: Persisting plan to database...');
    await dbExecute(
      'INSERT INTO crop_plans (farmer_id, crop_name, sowing_schedule, irrigation_plan, fertilizer_schedule, pest_alerts, harvest_timeline) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [farmerId, cropName, plan.sowing_schedule, plan.irrigation_plan, plan.fertilizer_schedule, plan.pest_alerts, plan.harvest_timeline]
    );
    const planId = await dbLastInsertId();
    plan.plan_id = planId;
    
    void saveMemory(farmerId, 'plan', `Generated new ${plan.status} plan for ${cropName}. Harvest in ~${plan.harvest_timeline.slice(0, 30)}...`);
    trace.push(`Step 3 ✓: Plan #${planId} saved.`);
  }

  return { success: true, data: plan, trace };
}
