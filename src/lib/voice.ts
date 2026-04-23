// src/lib/voice.ts
// Web Speech API utilities — voice input + output for SuperFarmer
// Works on Android Chrome/Edge — no API cost required

/** Strip markdown so text sounds natural when spoken */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
}

/** Check if speech APIs are available in this browser */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) &&
    'speechSynthesis' in window;
}

/** Check if text-to-speech is available */
export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak text aloud using the device's TTS engine */
export function speak(text: string, lang = 'en-IN', rate = 0.95): void {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
}

/** Stop any ongoing speech */
export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

/** Check if currently speaking */
export function isSpeaking(): boolean {
  return isTTSSupported() && window.speechSynthesis.speaking;
}

// SpeechRecognition is not in TypeScript's DOM lib — use `any` to avoid build errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

/** Start voice recognition. Returns the recognition instance so caller can stop it. */
export function startListening(
  onResult: (text: string) => void,
  onEnd?: () => void,
  lang = 'en-IN'
): SR | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const sr: SR = new SpeechRecognition();
  sr.lang = lang;
  sr.continuous = false;
  sr.interimResults = true;
  sr.maxAlternatives = 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sr.onresult = (e: any) => {
    const transcript = Array.from(e.results as ArrayLike<SpeechRecognitionResult>)
      .map((r: SpeechRecognitionResult) => r[0].transcript)
      .join('');
    if ((e.results as SpeechRecognitionResultList)[e.results.length - 1].isFinal) {
      onResult(transcript);
    }
  };

  sr.onend = () => { onEnd?.(); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sr.onerror = (e: any) => { 
    console.error('Speech recognition error:', e.error, e.message);
    if (e.error === 'not-allowed') alert('Microphone permission blocked. Please allow mic access in your browser settings.');
    else if (e.error === 'network') alert('Network error. Speech recognition requires an internet connection.');
    else if (e.error !== 'no-speech') alert('Mic error: ' + e.error);
    onEnd?.(); 
  };

  sr.start();
  return sr;
}

/** Stop a running speech recognition instance */
export function stopListening(sr: SR | null): void {
  try { sr?.stop(); } catch { /* ignore */ }
}

/** Map farmer language code to BCP-47 speech lang code */
export function getLangCode(preferred: string): string {
  const MAP: Record<string, string> = {
    hi: 'hi-IN',
    mr: 'mr-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    ta: 'ta-IN',
    en: 'en-IN',
  };
  return MAP[preferred] ?? 'en-IN';
}
