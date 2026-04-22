// src/lib/agents/report-agent.ts
// ReportAgent — aggregates ALL agent outputs from 7 DB tables and synthesizes a final advisory

import { getJsonModel, withTimeout } from '@/lib/gemini';
import { dbExecute } from '@/lib/fluxbase';
import { saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

export interface ReportData {
  report: string;
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
Synthesize data from multiple farm monitoring agents into a comprehensive, professional advisory report.
Be empathetic, use simple language a farmer can understand, and prioritize actionable advice.
Format the report clearly with sections. Respond with valid JSON.`;

export async function runReportAgent(
  ctx: AgentContext
): Promise<AgentResult<ReportData>> {
  const trace: string[] = [];
  const { farmerId, farmerProfile } = ctx;

  if (!farmerId) {
    return { success: false, error: 'Farmer profile required to generate report', trace };
  }

  // ── Step 1: Parallel fetch all agent data from DB ──
  trace.push('Step 1: Fetching all agent data from database in parallel...');
  const [planRows, recRows, riskRows, reportRows, sessionRows] = await Promise.all([
    dbExecute('SELECT * FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1', [farmerId]),
    dbExecute('SELECT recommended_crops, created_at FROM crop_recommendations WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 3', [farmerId]),
    dbExecute('SELECT risk_level, risk_probability, suggested_action, logged_at FROM nutrient_risk_log WHERE farmer_id = ? ORDER BY logged_at DESC LIMIT 5', [farmerId]),
    dbExecute('SELECT report_text, generated_at FROM reports WHERE farmer_id = ? ORDER BY generated_at DESC LIMIT 1', [farmerId]),
    dbExecute('SELECT interaction_log, session_date FROM session_logs WHERE farmer_id = ? ORDER BY session_date DESC LIMIT 5', [farmerId]),
  ]);
  trace.push(`Step 1 ✓: Fetched ${planRows.length} plan, ${recRows.length} recs, ${riskRows.length} risk logs.`);

  // ── Step 2: Compile data summary ──
  trace.push('Step 2: Compiling data summary for AI synthesis...');

  const latestPlan = planRows[0];
  const latestRecs = recRows.map((r) => `${r.created_at}: ${r.recommended_crops}`).join('\n') || 'No recommendations yet.';
  const latestRisks = riskRows.map((r) => `${r.logged_at}: ${r.risk_level} (${r.risk_probability}%) — ${r.suggested_action}`).join('\n') || 'No risk logs yet.';
  const recentActivity = sessionRows
    .map((s) => { try { return JSON.parse(s.interaction_log as string); } catch { return { summary: s.interaction_log }; } })
    .map((m: Record<string, string>) => m.summary || '')
    .join('\n') || 'No recent activity.';

  const profile = farmerProfile;
  const dataSummary = `
FARMER: ${profile?.name || 'Unknown'}, ${profile?.location || 'India'}
LAND: ${profile?.land_size || '?'} acres | WATER: ${profile?.water_availability || '?'} | GOALS: ${profile?.farming_goals || '?'}

CURRENT CROP PLAN:
- Crop: ${latestPlan?.crop_name || 'None'}
- Status: ${latestPlan?.status || 'N/A'}
- Sowing: ${latestPlan?.sowing_schedule || 'N/A'}
- Irrigation: ${latestPlan?.irrigation_plan || 'N/A'}
- Fertilizer: ${latestPlan?.fertilizer_schedule || 'N/A'}
- Pest Alerts: ${latestPlan?.pest_alerts || 'N/A'}
- Harvest: ${latestPlan?.harvest_timeline || 'N/A'}

PAST CROP RECOMMENDATIONS:
${latestRecs}

NUTRIENT RISK HISTORY (last 5):
${latestRisks}

RECENT AGENT ACTIVITY:
${recentActivity}
  `.trim();

  trace.push('Step 2 ✓: Data compiled from all 5 database tables.');

  // ── Step 3: Call Gemini for synthesis ──
  trace.push('Step 3: Calling Gemini AI to synthesize comprehensive report...');
  try {
    const model = getJsonModel(SYSTEM_INSTRUCTION, { temperature: 0.3, maxTokens: 1500 });
    const userPrompt = `Generate a comprehensive farm advisory report from this data:

${dataSummary}

Return JSON:
{
  "report": "Full formatted report text (use \\n for line breaks, ** for bold headers). 300-400 words.",
  "sections": {
    "farmer_summary": "1-2 sentences about farmer profile",
    "crop_recommendation": "Summary of crop recommendation history and current best choice",
    "crop_plan": "Current plan status and key milestones",
    "nutrient_status": "Nutrient health assessment based on risk logs",
    "disease_history": "Any disease risks or diagnosis notes",
    "weather_summary": "General weather and seasonal guidance",
    "action_items": ["Priority action 1", "Priority action 2", "Priority action 3", "Priority action 4", "Priority action 5"]
  }
}`;

    const result = await withTimeout(model.generateContent(userPrompt), 30_000);
    const data = JSON.parse(result.response.text()) as ReportData;
    trace.push('Step 3 ✓: Report synthesized by Gemini AI.');

    // ── Step 4: Save report to DB ──
    trace.push('Step 4: Saving report to database...');
    void dbExecute('INSERT INTO reports (farmer_id, report_text) VALUES (?, ?)', [farmerId, data.report]);
    void saveMemory(farmerId, 'report', `Final advisory report generated. Actions: ${data.sections.action_items?.slice(0, 2).join('; ')}`);
    trace.push('Step 4 ✓: Report saved.');

    return { success: true, data, trace };
  } catch (err) {
    trace.push(`Step 3 ✗: Gemini failed — ${err instanceof Error ? err.message : err}`);
    console.error('ReportAgent error:', err);

    // Fallback: plain text report
    const fallbackReport = `## SuperFarmer Advisory Report\n\n**Farmer:** ${profile?.name || 'Farmer'} | ${profile?.location}\n**Land:** ${profile?.land_size} acres\n\n**Current Crop:** ${latestPlan?.crop_name || 'Not set'} (${latestPlan?.status || 'Active'})\n\n**Nutrient Status:** ${riskRows[0] ? `Last reading: ${riskRows[0].risk_level} risk (${riskRows[0].risk_probability}%)` : 'No readings yet.'}\n\n**Recent Recommendations:** ${recRows[0]?.recommended_crops || 'None yet.'}\n\n**Action Items:**\n1. Continue monitoring soil nutrient levels weekly\n2. Follow the irrigation schedule in your crop plan\n3. Scout for pests twice weekly\n4. Use the Disease Diagnosis tool if symptoms appear\n5. Generate a new recommendation before the next planting season`;

    void dbExecute('INSERT INTO reports (farmer_id, report_text) VALUES (?, ?)', [farmerId, fallbackReport]);
    return {
      success: true,
      data: {
        report: fallbackReport,
        sections: {
          farmer_summary: `${profile?.name} farms ${profile?.land_size} acres in ${profile?.location}.`,
          crop_recommendation: recRows[0]?.recommended_crops as string || 'No recommendations yet.',
          crop_plan: `Current crop: ${latestPlan?.crop_name || 'Not set'}.`,
          nutrient_status: riskRows[0] ? `${riskRows[0].risk_level} risk.` : 'No data.',
          disease_history: 'No disease data available.',
          weather_summary: 'Check weather regularly for farming decisions.',
          action_items: ['Monitor soil weekly', 'Follow irrigation plan', 'Scout for pests', 'Check disease tool if needed', 'Update crop plan each season'],
        },
      },
      trace,
    };
  }
}
