// src/lib/agents/tools/executor.ts
// Translates Groq tool_call requests into real function calls against existing agents + DB.
// Each function returns a plain string that is fed back into the Groq conversation.

import { dbExecute } from '@/lib/fluxbase';
import { formatMemory } from '@/lib/agents/context';
import { runDiseaseAgent } from '@/lib/agents/disease-agent';
import { runRecommendationAgent } from '@/lib/agents/recommendation-agent';
import { runReportAgent } from '@/lib/agents/report-agent';
import type { AgentContext } from '@/lib/agents/types';
import type { FarmToolName } from './registry';

// Live-ish mandi prices (updated periodically — could hook to a live API in future)
const MANDI_PRICES: Record<string, { price: string; change: string; unit: string }> = {
  wheat:      { price: '₹2,275', change: '+1.2%', unit: 'per quintal' },
  rice:       { price: '₹3,900', change: '+0.8%', unit: 'per quintal' },
  basmati:    { price: '₹4,800', change: '+0.5%', unit: 'per quintal' },
  tomato:     { price: '₹1,450', change: '-3.5%', unit: 'per quintal' },
  onion:      { price: '₹980',   change: '+2.1%', unit: 'per quintal' },
  potato:     { price: '₹820',   change: '-1.2%', unit: 'per quintal' },
  soybean:    { price: '₹4,200', change: '+0.5%', unit: 'per quintal' },
  maize:      { price: '₹1,820', change: '-1.0%', unit: 'per quintal' },
  cotton:     { price: '₹6,500', change: '+1.8%', unit: 'per quintal' },
  groundnut:  { price: '₹5,150', change: '+0.3%', unit: 'per quintal' },
  mustard:    { price: '₹5,450', change: '-0.7%', unit: 'per quintal' },
  sugarcane:  { price: '₹315',   change: '0.0%',  unit: 'per quintal' },
  chickpea:   { price: '₹5,800', change: '+1.5%', unit: 'per quintal' },
  lentil:     { price: '₹6,100', change: '+2.2%', unit: 'per quintal' },
  sunflower:  { price: '₹5,600', change: '+0.9%', unit: 'per quintal' },
};

// ─────────────────────────────────────────────────────────
// Main executor — called from the ReAct orchestrator loop
// ─────────────────────────────────────────────────────────
export async function executeTool(
  toolName: FarmToolName,
  toolArgs: Record<string, string>,
  ctx: AgentContext,
  onThinking?: (msg: string) => void
): Promise<string> {
  const emit = (msg: string) => onThinking?.(msg);

  switch (toolName) {
    // ── 1. Farmer Profile ──────────────────────────────────
    case 'get_farmer_profile': {
      emit('📋 Reading your farm profile...');
      if (!ctx.farmerId) return 'No farmer profile found. The farmer needs to complete intake first.';
      const rows = await dbExecute(
        'SELECT * FROM farmer_profile WHERE farmer_id = ? LIMIT 1',
        [ctx.farmerId]
      );
      const p = rows[0];
      if (!p) return 'Farmer profile not found.';
      return `Farmer Profile:
- Name: ${p.name}
- Location: ${p.location}
- Land Size: ${p.land_size} acres
- Water Availability: ${p.water_availability}
- Farming Goals: ${p.farming_goals}`;
    }

    // ── 2. Current Crop Plan ───────────────────────────────
    case 'get_crop_plan': {
      emit('🌾 Fetching your current crop plan...');
      if (!ctx.farmerId) return 'No crop plan found — farmer needs to set up a plan first.';
      const rows = await dbExecute(
        'SELECT * FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1',
        [ctx.farmerId]
      );
      const plan = rows[0];
      if (!plan) return 'No active crop plan found. The farmer should create one via the Plan page.';
      return `Current Crop Plan:
- Crop: ${plan.crop_name}
- Status: ${plan.status || 'Active'}
- Sowing Schedule: ${plan.sowing_schedule}
- Irrigation Plan: ${plan.irrigation_plan}
- Fertilizer Schedule: ${plan.fertilizer_schedule}
- Pest Alerts: ${plan.pest_alerts}
- Harvest Timeline: ${plan.harvest_timeline}`;
    }

    // ── 3. Crop Recommendations ────────────────────────────
    case 'get_crop_recommendations': {
      emit('🤖 Calling AI Agronomist for crop recommendations...');
      const result = await runRecommendationAgent(ctx, {
        soil_type: toolArgs.soil_type || ctx.farmerProfile?.farming_goals || 'Black',
        water_const: toolArgs.water_level || ctx.farmerProfile?.water_availability || 'Medium',
        season: toolArgs.season || 'Kharif (June-October, Monsoon)',
        goal: toolArgs.goal || ctx.farmerProfile?.farming_goals || 'Maximum yield and profit',
      });
      if (!result.success || !result.data) return 'Could not get crop recommendations right now.';
      const { primary_crop, crops, overall_advice } = result.data;
      return `Crop Recommendations:
- Top Pick: ${primary_crop}
- Options: ${crops.map((c) => `${c.name} (${c.care_tip})`).join(' | ')}
- Agronomist Advice: ${overall_advice}`;
    }

    // ── 4. Disease Diagnosis ───────────────────────────────
    case 'diagnose_crop_disease': {
      emit('🔬 Diagnosing crop disease from symptoms...');
      // Pick up imageBase64 from context if the user attached a photo
      const ctxWithImage = ctx as AgentContext & { imageBase64?: string };
      const result = await runDiseaseAgent(ctx, {
        symptoms: toolArgs.symptoms,
        cropType: toolArgs.crop_type || 'Unknown',
        imageBase64: ctxWithImage.imageBase64,
      });
      if (!result.success || !result.data) return 'Disease diagnosis failed. Please describe symptoms more clearly.';
      const { diagnosis, confidence, treatment, prevention } = result.data;
      return `Disease Diagnosis:
- Disease: ${diagnosis}
- Confidence: ${confidence}
- Treatment: ${treatment}
- Prevention: ${prevention}`;
    }

    // ── 5. Agent Memory (cross-session history) ────────────────────────
    case 'get_agent_memory': {
      emit('🧠 Retrieving your past conversation history...');
      if (!ctx.farmerId) return 'No interaction history found.';
      const rows = await dbExecute(
        'SELECT interaction_log, session_date FROM session_logs WHERE farmer_id = ? ORDER BY session_date DESC LIMIT 8',
        [ctx.farmerId]
      );
      if (!rows.length) return 'No previous AI interactions found. This appears to be a new farmer.';

      const formatted = rows.map((r) => {
        try {
          const log = JSON.parse(r.interaction_log as string);
          const date = new Date(log.timestamp || r.session_date as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          
          if (log.agent === 'agentic-chat' && log.question) {
            const toolsStr = log.toolsUsed?.length ? ` [via ${log.toolsUsed.join(', ')}]` : '';
            const answer = log.answer || log.response || '';
            return `• [${date}] Farmer asked: "${log.question.slice(0, 100)}" → AI said: "${answer.slice(0, 150)}"${toolsStr}`;
          }
          if (log.agent === 'reminder') {
            return `• [${date}] 📝 Reminder set: "${log.summary}"`;
          }
          if (log.summary) {
            return `• [${date}] [${log.agent}]: ${log.summary.slice(0, 120)}`;
          }
          return null;
        } catch {
          return null;
        }
      }).filter(Boolean).join('\n');

      return `Cross-Session Memory (recent conversations):\n${formatted || 'No detailed history available.'}`;
    }

    // ── 6. Full Crop Report ────────────────────────────────
    case 'generate_crop_report': {
      emit('📊 Generating your complete farm report...');
      const result = await runReportAgent(ctx);
      if (!result.success || !result.data) return 'Report generation failed.';
      return `Farm Advisory Report:\n${result.data.report}\n\nKey Action Items:\n${result.data.sections.action_items?.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    }

    // ── 7. Mandi Prices ────────────────────────────────────
    case 'get_mandi_prices': {
      emit(`💰 Looking up mandi price for ${toolArgs.crop_name}...`);
      const key = toolArgs.crop_name?.toLowerCase().trim();
      const found = Object.entries(MANDI_PRICES).find(([k]) => key?.includes(k) || k.includes(key));
      if (found) {
        const [name, data] = found;
        return `Mandi Price for ${name.charAt(0).toUpperCase() + name.slice(1)}: ${data.price} ${data.unit} (Today's change: ${data.change}). Data is approximate — check AgMarkNet or local mandi for exact rates.`;
      }
      return `Mandi price for "${toolArgs.crop_name}" not available in our database. Please check AgMarkNet (agmarknet.gov.in) for live prices.`;
    }

    // ── 8. Save Reminder ───────────────────────────────────
    case 'save_reminder': {
      emit('📝 Saving your farming reminder...');
      if (!ctx.farmerId) return 'Could not save reminder — no farmer profile found.';
      await dbExecute(
        'INSERT INTO session_logs (farmer_id, interaction_log) VALUES (?, ?)',
        [ctx.farmerId, JSON.stringify({ agent: 'reminder', summary: toolArgs.reminder, timestamp: new Date().toISOString() })]
      );
      return `✅ Reminder saved: "${toolArgs.reminder}"`;
    }

    default:
      return `Tool "${toolName}" is not available.`;
  }
}
