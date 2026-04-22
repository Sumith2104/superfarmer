// src/lib/gemini.ts
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genai = new GoogleGenerativeAI(apiKey);
const groqApiKey = process.env.GROQ_API_KEY || '';

export function stripCodeFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export function withTimeout<T>(promise: Promise<T>, ms = 120_000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * HybridModel uses Groq Cloud (Main Chick) for text processing (insanely fast)
 * and falls back to Gemini API (Side Chick) if Groq fails or if dealing with Images.
 */
class HybridModel {
  constructor(
    private systemInstruction: string,
    private isVision: boolean,
    private jsonMode: boolean,
    private geminiModelName: string,
    private groqModelName: string
  ) {}

  async generateContent(contents: any) {
    let promptText: string = '';
    let hasImages = false;

    // Extract text and see if images are present
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (typeof item === 'string') promptText += item + '\n';
        else if (item.text) promptText += item.text + '\n';
        
        if (item.inlineData && item.inlineData.data) {
          hasImages = true;
        }
      }
    } else if (typeof contents === 'string') {
      promptText = contents;
    } else if (contents?.parts) {
       promptText = JSON.stringify(contents); // rudimentary fallback
    } else {
       promptText = String(contents);
    }

    // 1. VISION CHECK: Groq doesn't natively do Gemini-styled vision yet.
    // If it is a vision task, instantly trigger the fallback to Gemini.
    if (hasImages || this.isVision) {
      console.log(`[Hybrid AI] Image detected. Skipping Groq, routing directly to Gemini Vision...`);
      return this.fallbackToGemini(contents);
    }

    // 2. PRIMARY CLOUD LLM: Groq API
    try {
      console.log(`[Hybrid AI] Attempting primary request with Groq Cloud (${this.groqModelName})...`);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.groqModelName,
          messages: [
            ...(this.systemInstruction ? [{ role: 'system', content: this.systemInstruction }] : []),
            { role: 'user', content: promptText + (this.jsonMode && !/json/i.test(this.systemInstruction + promptText) ? '\n\nPlease output valid JSON format.' : '') }
          ],
          response_format: this.jsonMode ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Hybrid AI] Groq generated in ${data.usage?.total_time || '<1'} seconds.`);
      
      return {
        response: {
          text: () => data.choices[0].message.content
        }
      };
    } catch (groqErr: any) {
      console.warn(`[Hybrid AI] Groq Cloud failed (${groqErr.message}). Falling back to Gemini...`);
      return this.fallbackToGemini(contents);
    }
  }

  // 3. FALLBACK: Gemini API
  private async fallbackToGemini(contents: any) {
    const generationConfig: GenerationConfig = {
      topP: 0.8,
      responseMimeType: this.jsonMode ? 'application/json' : 'text/plain',
    };
    
    const model = genai.getGenerativeModel({
      model: this.geminiModelName,
      systemInstruction: this.systemInstruction,
      generationConfig
    });
    
    return await model.generateContent(contents);
  }
}

/**
 * Returns a Hybrid model pre-configured for JSON output.
 * We map 'llama3' to Groq's official 8B Llama 3 model ID.
 */
export function getJsonModel(
  systemInstruction: string,
  options: { temperature?: number; maxTokens?: number; modelName?: string } = {}
) {
  const { modelName = 'gemini-3.1-flash-lite-preview' } = options;
  return new HybridModel(systemInstruction, false, true, modelName, 'llama-3.1-8b-instant');
}

/**
 * Vision model - immediately triggered to Gemini.
 */
export function getVisionModel(systemInstruction: string) {
  return new HybridModel(systemInstruction, true, true, 'gemini-3.1-flash-lite-preview', 'llama-3.1-8b-instant');
}

/**
 * Standard text model interface.
 */
export function getGeminiModel(modelName = 'gemini-3.1-flash-lite-preview') {
  return new HybridModel('', false, false, modelName, 'llama-3.1-8b-instant');
}
