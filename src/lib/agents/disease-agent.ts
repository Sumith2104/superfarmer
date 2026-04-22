// src/lib/agents/disease-agent.ts
// DiseaseDiagnosisAgent — handles plant disease identification via vision or text symptoms

import { getVisionModel, withTimeout } from '@/lib/gemini';
import { saveMemory } from './context';
import type { AgentContext, AgentResult } from './types';

export interface DiseaseProduct {
  name: string;
  type: string; // e.g. "Fungicide", "Pesticide", "Bio-stimulant"
  dose: string; // e.g. "2ml/L water"
  searchQuery: string; // for Amazon search
}

export interface DiseaseData {
  diagnosis: string;
  confidence: string;
  treatment: string;
  prevention: string;
  products: DiseaseProduct[];
}

const SYSTEM_INSTRUCTION = `You are an AI Plant Pathologist Agent.
Analyze symptoms from images or text descriptions to diagnose crop diseases.
Provide clear, organic-first treatment plans where possible.
Be precise and cautionary about chemical usage.
Return JSON only.`;

export async function runDiseaseAgent(
  ctx: AgentContext,
  input: { symptoms?: string; imageBase64?: string; cropType?: string }
): Promise<AgentResult<DiseaseData>> {
  const trace: string[] = [];
  const { farmerId } = ctx;

  trace.push('Step 1: Preparing disease diagnosis analysis...');
  
  const model = getVisionModel(SYSTEM_INSTRUCTION);
  const prompt = `Crop: ${input.cropType || 'Unknown'}\nSymptoms: ${input.symptoms || 'Visual only'}\n\nAnalyze the provided information and image to diagnose the disease. Return JSON:\n{\n  "diagnosis": "Name of the disease",\n  "confidence": "High/Medium/Low or percentage like 85%",\n  "treatment": "Actionable treatment steps (organic & chemical), each step on a new line",\n  "prevention": "Preventative measures for next season, each point on a new line",\n  "products": [\n    { "name": "Product Name (e.g. Mancozeb 75 WP)", "type": "Fungicide/Pesticide/Fertilizer/Bio-stimulant", "dose": "Usage dose e.g. 2g/L water", "searchQuery": "short Amazon search query e.g. mancozeb fungicide india" },\n    { "name": "...", "type": "...", "dose": "...", "searchQuery": "..." }\n  ]\n}\nProvide 2-4 relevant products that would help treat this disease. Include at least one organic/bio option if available.`;

  try {
    trace.push(`Step 2: Calling Vision AI for ${input.imageBase64 ? 'image analysis' : 'symptom analysis'}...`);
    
    let result;
    if (input.imageBase64) {
      result = await withTimeout(model.generateContent([
        prompt,
        { inlineData: { data: input.imageBase64.split(',')[1] || input.imageBase64, mimeType: 'image/jpeg' } }
      ]));
    } else {
      result = await withTimeout(model.generateContent(prompt));
    }

    const raw = result.response.text().replace(/```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const data = JSON.parse(raw) as DiseaseData;
    if (!data.products) data.products = [];
    trace.push(`Step 2 ✓: Diagnosis complete: ${data.diagnosis}`);

    if (farmerId) {
      void saveMemory(farmerId, 'disease', `Diagnosed ${data.diagnosis} on ${input.cropType || 'plant'}. Confidence: ${data.confidence}`);
    }

    return { success: true, data, trace };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Diagnosis failed';
    trace.push(`Step 2 ✗: AI Analysis failed — ${errorMsg}`);
    return { success: false, error: errorMsg, trace };
  }
}
