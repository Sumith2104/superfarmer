// src/lib/agents/dashboard-agent.ts
// DashboardAgent — synthesizes data from multiple agents into a unified farm status report

import { dbExecute } from '@/lib/fluxbase';
import { runWeatherAgent } from './weather-agent';
import { getJsonModel, withTimeout } from '@/lib/gemini';
import type { AgentContext, AgentResult, DashboardData } from './types';

export async function runDashboardAgent(
  ctx: AgentContext
): Promise<AgentResult<DashboardData>> {
  const trace: string[] = ['Step 1: Commencing unified dashboard synthesis...'];
  const { farmerId, farmerProfile } = ctx;

  if (!farmerId || !farmerProfile) {
    return { success: false, error: 'Farmer profile required for dashboard', trace };
  }

  try {
    // 1. Fetch Weather (Parallel)
    trace.push('Step 2: Fetching live weather intelligence...');
    const weatherResult = await runWeatherAgent(ctx, farmerProfile.location);
    const weatherSummary = weatherResult.success ? weatherResult.data!.suggestion : 'Weather analysis unavailable.';

    // 2. Fetch Latest Nutrient Risk
    trace.push('Step 3: Checking latest nutrient risk logs...');
    const riskRows = await dbExecute(
      'SELECT risk_level, suggested_action FROM nutrient_risk_log WHERE farmer_id = ? ORDER BY logged_at DESC LIMIT 1',
      [farmerId]
    );
    const latestRisk = riskRows[0] as { risk_level: string; suggested_action: string } | undefined;
    const nutrientStatus: DashboardData['nutrient_status'] = {
      level: (latestRisk?.risk_level as any) || 'Safe',
      message: latestRisk?.suggested_action || 'No nutrient risks detected recently.'
    };

    // 3. Fetch Active Plan
    trace.push('Step 4: Loading active crop plan status...');
    const planRows = await dbExecute(
      'SELECT crop_name, status, sowing_schedule FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1',
      [farmerId]
    );
    const latestPlan = planRows[0] as { crop_name: string; status: string; sowing_schedule: string } | undefined;
    let activePlanData: DashboardData['active_plan'] | undefined;
    if (latestPlan) {
      activePlanData = {
        crop: latestPlan.crop_name,
        next_task: 'Monitor growth and follow irrigation schedule.',
        progress: 15 // Mock progress for UI
      };
    }

    // 4. AI Synthesis for Dashboard Greeting & Pulse
    trace.push('Step 5: Synthesizing AI Pulse via Gemini...');
    let greeting = `Hello, ${farmerProfile.name}!`;
    let aiPulse = 'All systems normal. Monitoring farm vitals.';

    try {
      const model = getJsonModel('You are a friendly AI Farm Manager summary tool. Provide a 1-sentence greeting and 1-sentence status pulse.');
      const prompt = `
        Farmer: ${farmerProfile.name}
        Weather: ${weatherSummary}
        Risk: ${nutrientStatus.level}
        Crop: ${activePlanData?.crop || 'None'}
        
        Return JSON: {"greeting": "Warm greeting", "pulses": "Short command-center style status update"}`;
      
      const aiResponse = await withTimeout(model.generateContent(prompt), 8000);
      const parsed = JSON.parse(aiResponse.response.text());
      greeting = parsed.greeting || greeting;
      aiPulse = parsed.pulses || aiPulse;
      trace.push('Step 5 ✓: AI synthesis complete.');
    } catch (e) {
      trace.push('Step 5 !: AI synthesis failed, using defaults.');
    }

    return {
      success: true,
      data: {
        greeting,
        weather_summary: weatherSummary,
        nutrient_status: nutrientStatus,
        active_plan: activePlanData,
        ai_pulse: aiPulse
      },
      trace
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dashboard agent failed';
    trace.push(`Step X ✗: ${msg}`);
    return { success: false, error: msg, trace };
  }
}
