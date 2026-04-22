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

// ── Groq rate-limit cooldown ─────────────────────────────
// When Groq returns 429, skip it for GROQ_COOLDOWN_MS to avoid
// hammering the API and wasting quota on failed calls.
let groqCooldownUntil = 0;
const GROQ_COOLDOWN_MS = 60_000; // 60 seconds

function isGroqOnCooldown(): boolean {
  return Date.now() < groqCooldownUntil;
}

function setGroqCooldown(retryAfterMs = GROQ_COOLDOWN_MS) {
  groqCooldownUntil = Date.now() + retryAfterMs;
  console.warn(`[Hybrid AI] Groq on cooldown for ${Math.ceil(retryAfterMs / 1000)}s — routing all requests to Gemini.`);
}

/** Parse retry-after from Groq 429 body if available */
function parseRetryAfter(body: string): number {
  try {
    const match = body.match(/try again in (\d+(?:\.\d+)?)\s*(ms|s|second)/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const ms = unit === 'ms' ? val : val * 1000;
      return Math.max(ms + 2000, GROQ_COOLDOWN_MS); // at least 60s
    }
  } catch { /* ignore */ }
  return GROQ_COOLDOWN_MS;
}

/**
 * HybridModel — Groq Cloud primary, Gemini fallback.
 * Smart cooldown: after a 429, skips Groq for 60 seconds.
 */
class HybridModel {
  constructor(
    private systemInstruction: string,
    private isVision: boolean,
    private jsonMode: boolean,
    private geminiModelName: string,
    private groqModelName: string
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateContent(contents: any) {
    let promptText = '';
    let hasImages = false;

    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (typeof item === 'string') promptText += item + '\n';
        else if (item.text) promptText += item.text + '\n';
        if (item.inlineData?.data) hasImages = true;
      }
    } else if (typeof contents === 'string') {
      promptText = contents;
    } else if (contents?.parts) {
      promptText = JSON.stringify(contents);
    } else {
      promptText = String(contents);
    }

    // Vision → always Gemini
    if (hasImages || this.isVision) {
      console.log(`[Hybrid AI] Vision task — routing directly to Gemini.`);
      return this.fallbackToGemini(contents);
    }

    // Cooldown active → skip Groq, go straight to Gemini
    if (isGroqOnCooldown()) {
      const remaining = Math.ceil((groqCooldownUntil - Date.now()) / 1000);
      console.log(`[Hybrid AI] Groq cooldown active (${remaining}s left) — using Gemini.`);
      return this.fallbackToGemini(contents);
    }

    // Try Groq
    try {
      console.log(`[Hybrid AI] Attempting Groq Cloud (${this.groqModelName})...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.groqModelName,
          messages: [
            ...(this.systemInstruction ? [{ role: 'system', content: this.systemInstruction }] : []),
            {
              role: 'user',
              content:
                promptText +
                (this.jsonMode && !/json/i.test(this.systemInstruction + promptText)
                  ? '\n\nPlease output valid JSON format.'
                  : ''),
            },
          ],
          response_format: this.jsonMode ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          const cooldownMs = parseRetryAfter(errorText);
          setGroqCooldown(cooldownMs);
        }
        throw new Error(`Groq HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json();
      console.log(`[Hybrid AI] Groq generated in ${data.usage?.total_time ?? '<1'} seconds.`);
      return { response: { text: () => data.choices[0].message.content } };
    } catch (groqErr: unknown) {
      const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
      if (!msg.includes('429')) {
        // Non-rate-limit error — log but don't set cooldown
        console.warn(`[Hybrid AI] Groq error (${msg}). Falling back to Gemini...`);
      }
      return this.fallbackToGemini(contents);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fallbackToGemini(contents: any) {
    const generationConfig: GenerationConfig = {
      topP: 0.8,
      responseMimeType: this.jsonMode ? 'application/json' : 'text/plain',
    };
    const model = genai.getGenerativeModel({
      model: this.geminiModelName,
      systemInstruction: this.systemInstruction,
      generationConfig,
    });
    return await model.generateContent(contents);
  }
}

export function getJsonModel(
  systemInstruction: string,
  options: { temperature?: number; maxTokens?: number; modelName?: string } = {}
) {
  const { modelName = 'gemini-2.0-flash-lite' } = options;
  return new HybridModel(systemInstruction, false, true, modelName, 'llama-3.1-8b-instant');
}

export function getVisionModel(systemInstruction: string) {
  return new HybridModel(systemInstruction, true, true, 'gemini-2.0-flash-lite', 'llama-3.1-8b-instant');
}

export function getGeminiModel(modelName = 'gemini-2.0-flash-lite') {
  return new HybridModel('', false, false, modelName, 'llama-3.1-8b-instant');
}
