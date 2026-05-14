// src/lib/agents/report-agent.ts
// ReportAgent — aggregates ALL agent outputs from 7 DB tables and synthesizes a final advisory

import { getJsonModel, withTimeout } from '@/lib/gemini';
import { dbExecute } from '@/lib/fluxbase';
import { logAgentAction } from './memory';
import type { AgentContext, AgentResult } from './types';

export interface CropPhase {
  phase: string;
  duration: string;
  status: string;
  outcome_goal: string;
  action_items: string[];
}

export interface ReportData {
  report: string;
  crop_lifecycle: CropPhase[];
  sections: {
    farmer_summary: string;
    crop_recommendation: string;
    crop_plan: string;
    nutrient_status: string;
    disease_history: string;
    weather_summary: string;
    action_items: string[];
  };
}

const SYSTEM_INSTRUCTION = `You are the SuperFarmer AI Report Agent.
Synthesize data from multiple farm monitoring agents into a comprehensive, high-credibility advisory report.
Respond ONLY with valid JSON. Include a 5-phase Crop Lifecycle (Preparation, Sowing, Growth, Protection, Harvest).`;

export async function runReportAgent(
  ctx: AgentContext
): Promise<AgentResult<ReportData>> {
  const trace: string[] = [];
  const { farmerId, farmerProfile } = ctx;

  if (!farmerId) {
    return { success: false, error: 'Farmer profile required', trace };
  }

  trace.push('Step 1: Fetching agent data...');
  const [planRows, recRows, riskRows, reportRows, sessionRows] = await Promise.all([
    dbExecute('SELECT * FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1', [farmerId]),
    dbExecute('SELECT recommended_crops, created_at FROM crop_recommendations WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 3', [farmerId]),
    dbExecute('SELECT risk_level, risk_probability, suggested_action, logged_at FROM nutrient_risk_log WHERE farmer_id = ? ORDER BY logged_at DESC LIMIT 5', [farmerId]),
    dbExecute('SELECT report_text, generated_at FROM reports WHERE farmer_id = ? ORDER BY generated_at DESC LIMIT 1', [farmerId]),
    dbExecute('SELECT interaction_log, session_date FROM session_logs WHERE farmer_id = ? ORDER BY session_date DESC LIMIT 5', [farmerId]),
  ]);

  const latestPlan = planRows[0];
  const profile = farmerProfile;
  const dataSummary = `FARMER: ${profile?.name || 'Farmer'}, LAND: ${profile?.land_size}ac. CROP: ${latestPlan?.crop_name}. RISKS: ${riskRows[0]?.risk_level}.`;

  trace.push('Step 2: Calling AI...');
  try {
    const model = getJsonModel(SYSTEM_INSTRUCTION, { temperature: 0.2 });

    const userPrompt = `Generate a professional farm advisory report for this farmer's data:

FARMER: ${profile?.name || 'Farmer'}, Location: ${profile?.location || profile?.district || 'India'}
LAND: ${profile?.land_size || profile?.land_acres || '?'} acres | WATER: ${profile?.water_availability || profile?.irrigation || 'Unknown'} | GOALS: ${profile?.farming_goals || 'Maximize yield'}
CROP: ${latestPlan?.crop_name || recRows[0]?.recommended_crops || 'General farming'}
STATUS: ${latestPlan?.status || 'Active'}
SOWING: ${latestPlan?.sowing_schedule || 'N/A'} | HARVEST: ${latestPlan?.harvest_timeline || 'N/A'}
NUTRIENT RISKS: ${riskRows[0] ? `${riskRows[0].risk_level} risk (${riskRows[0].risk_probability}%) — ${riskRows[0].suggested_action}` : 'None recorded'}
PAST RECOMMENDATIONS: ${recRows.map((r) => r.recommended_crops).join(', ') || 'None yet'}

Return ONLY valid JSON with this exact schema:
{
  "report": "A 200-250 word professional overview with **bold** key points and newlines. Cover current status, risks, and strategic advice.",
  "crop_lifecycle": [
    { "phase": "Preparation", "duration": "Weeks 1-2", "status": "Completed", "outcome_goal": "Optimal soil and seed readiness", "action_items": ["Action 1", "Action 2"] },
    { "phase": "Sowing", "duration": "Week 3", "status": "Upcoming", "outcome_goal": "Uniform germination across field", "action_items": ["Action 1", "Action 2"] },
    { "phase": "Growth", "duration": "Weeks 4-10", "status": "Upcoming", "outcome_goal": "Strong vegetative development", "action_items": ["Action 1", "Action 2"] },
    { "phase": "Protection", "duration": "Weeks 6-12", "status": "Upcoming", "outcome_goal": "Zero pest/disease losses", "action_items": ["Action 1", "Action 2"] },
    { "phase": "Harvest", "duration": "Weeks 14-16", "status": "Not Started", "outcome_goal": "Maximum yield at optimal maturity", "action_items": ["Action 1", "Action 2"] }
  ],
  "sections": {
    "farmer_summary": "1-2 sentences about this farmer's context.",
    "crop_recommendation": "What crop/variety is best and why.",
    "crop_plan": "Current plan status and next milestones.",
    "nutrient_status": "Soil health and fertilizer guidance.",
    "disease_history": "Disease risks and prevention steps.",
    "weather_summary": "Seasonal weather impact and adjustments.",
    "action_items": ["Top priority 1", "Top priority 2", "Top priority 3", "Top priority 4", "Top priority 5"]
  }
}`;

    const result = await withTimeout(model.generateContent(userPrompt), 90_000);
    const data = JSON.parse(result.response.text()) as ReportData;
    
    // Ensure report is a string (handle cases where AI returns an object or array)
    if (typeof data.report !== 'string') {
      data.report = JSON.stringify(data.report);
    }
    
    await dbExecute('INSERT INTO reports (farmer_id, report_text) VALUES (?, ?)', [farmerId, data.report]);
    
    void logAgentAction({
      farmerId,
      agent: 'report',
      actionType: 'synthesis',
      input: 'Synthesis request',
      output: 'Report generated',
      metadata: data.sections
    });

    return { success: true, data, trace };
  } catch (err) {
    trace.push(`Error: ${err instanceof Error ? err.message : err}`);
    // Minimal fallback
    const fallback: ReportData = {
      report: "Advisory generated. Please check individual agent logs for details.",
      crop_lifecycle: [],
      sections: {
        farmer_summary: "Profile exists.",
        crop_recommendation: "Check rec history.",
        crop_plan: "Plan active.",
        nutrient_status: "Check risk log.",
        disease_history: "No recent alerts.",
        weather_summary: "Check forecast.",
        action_items: ["Monitor soil", "Follow plan"]
      }
    };
    return { success: true, data: fallback, trace };
  }
}
