// src/lib/agents/recommendation-agent.ts
// Multi-step CropRecommendationAgent with memory-augmented reasoning

import { getJsonModel, withTimeout } from '@/lib/gemini';
import { dbExecute } from '@/lib/fluxbase';
import { formatMemory, saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

interface CropItem { name: string; reason: string; care_tip: string; }
export interface RecommendationData {
  primary_crop: string;
  crops: CropItem[];
  overall_advice: string;
  ai_powered: boolean;
}

const SYSTEM_INSTRUCTION = `You are a Senior AI Agronomist with 20+ years advising Indian farmers.
You have access to this farmer's history and profile. Use it to give PERSONALIZED, CONTEXT-AWARE recommendations.
Never repeat the same crop if a better alternative exists given the farmer's history.
Respond ONLY with valid JSON. No markdown, no extra text.`;

const FALLBACKS: Record<string, string[]> = {
  Black: ['Cotton', 'Wheat', 'Soybean'],
  Alluvial: ['Rice', 'Sugarcane', 'Wheat'],
  Red: ['Groundnut', 'Millets', 'Pulses'],
  Laterite: ['Cashew', 'Coconut', 'Rice'],
  Sandy: ['Groundnut', 'Watermelon', 'Sweet Potato'],
  Clay: ['Rice', 'Sugarcane', 'Jute'],
};

export async function runRecommendationAgent(
  ctx: AgentContext,
  input: { soil_type: string; water_const: string; season: string; goal: string }
): Promise<AgentResult<RecommendationData>> {
  const trace: string[] = [];
  const { farmerId, farmerProfile, conversationHistory } = ctx;

  // ── Step 1: Retrieve past recommendations (agent memory) ──
  trace.push('Step 1: Loading past crop recommendations from database...');
  const pastRecs = farmerId
    ? await dbExecute(
        'SELECT recommended_crops, created_at FROM crop_recommendations WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 3',
        [farmerId]
      )
    : [];
  const pastCropText = pastRecs.length
    ? pastRecs.map((r) => `${r.created_at}: ${r.recommended_crops}`).join('\n')
    : 'None yet.';
  trace.push(`Step 1 ✓: Found ${pastRecs.length} past recommendation(s).`);

  // ── Step 2: Build memory-augmented prompt ──
  trace.push('Step 2: Building context-aware prompt with farmer memory...');
  const profile = farmerProfile;
  const profileText = profile
    ? `Name: ${profile.name}, Land: ${profile.land_size} acres, Location: ${profile.location}, Water: ${profile.water_availability}, Goals: ${profile.farming_goals}`
    : 'Profile not available.';
  const historyText = formatMemory(conversationHistory);

  const userPrompt = `## Farmer Profile
${profileText}

## Current Request
- Soil Type: ${input.soil_type}
- Water/Irrigation: ${input.water_const}
- Season: ${input.season}
- Goal: ${input.goal}

## Past Crop Recommendations (avoid repeating unless best option)
${pastCropText}

## Previous Agent Interactions
${historyText}

Based on all the above context, recommend the 3 best crops for THIS specific farmer.

Return JSON:
{
  "primary_crop": "single best crop",
  "crops": [
    {"name": "...", "reason": "personalized 1-2 sentence reason using their profile", "care_tip": "specific tip for their location/water setup"},
    {"name": "...", "reason": "...", "care_tip": "..."},
    {"name": "...", "reason": "...", "care_tip": "..."}
  ],
  "overall_advice": "2-3 sentences of personalized agronomic advice referencing their specific situation (${profile?.location || 'their location'}, ${input.season})"
}`;

  trace.push('Step 2 ✓: Prompt built with farmer memory and profile context.');

  // ── Step 3: Call Gemini ──
  trace.push('Step 3: Calling Gemini AI with memory-augmented context...');
  try {
    const model = getJsonModel(SYSTEM_INSTRUCTION, { temperature: 0.3, maxTokens: 900 });
    const result = await withTimeout(model.generateContent(userPrompt));
    const data = JSON.parse(result.response.text()) as RecommendationData;
    trace.push(`Step 3 ✓: AI recommended primary crop: ${data.primary_crop}`);

    // ── Step 4: Persist to DB + save memory ──
    trace.push('Step 4: Saving recommendation to database...');
    if (farmerId) {
      const cropNames = data.crops.map((c) => c.name).join(', ');
      void dbExecute(
        'INSERT INTO crop_recommendations (farmer_id, recommended_crops) VALUES (?, ?)',
        [farmerId, cropNames]
      );
      void saveMemory(farmerId, 'recommendation', `Recommended: ${data.primary_crop} for ${input.season} season (${input.soil_type} soil)`);
    }
    trace.push('Step 4 ✓: Saved to database.');

    return { success: true, data: { ...data, ai_powered: true }, trace };
  } catch (err) {
    trace.push(`Step 3 ✗: Gemini failed — ${err instanceof Error ? err.message : err}. Using fallback.`);
    console.error('RecommendationAgent Gemini error:', err);
  }

  // ── Fallback ──
  const recs = FALLBACKS[input.soil_type] || ['Sorghum', 'Maize', 'Pearl Millet'];
  if (farmerId) {
    void dbExecute('INSERT INTO crop_recommendations (farmer_id, recommended_crops) VALUES (?, ?)', [farmerId, recs.join(', ')]);
  }
  return {
    success: true,
    data: {
      primary_crop: recs[0],
      crops: recs.map((c) => ({
        name: c,
        reason: `Well-suited for ${input.soil_type} soil with ${input.water_const} water availability.`,
        care_tip: 'Consult your local Krishi Vigyan Kendra for region-specific guidance.',
      })),
      overall_advice: `For ${input.soil_type} soil in ${input.season}, ${recs[0]} is a safe primary choice. Maintain soil pH between 6.0–7.5.`,
      ai_powered: false,
    },
    trace,
  };
}
