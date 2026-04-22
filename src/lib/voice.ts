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
  window.speechSynthesis.cancel(); // stop any current speech
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  // Pick a matching voice if available
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

type SpeechRecognitionInstance = InstanceType<typeof window.SpeechRecognition>;

/** Start voice recognition. Returns the recognition instance so caller can stop it. */
export function startListening(
  onResult: (text: string) => void,
  onEnd?: () => void,
  lang = 'en-IN'
): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  const sr: SpeechRecognitionInstance = new SR();
  sr.lang = lang;
  sr.continuous = false;
  sr.interimResults = true;
  sr.maxAlternatives = 1;

  sr.onresult = (e: SpeechRecognitionEvent) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    if (e.results[e.results.length - 1].isFinal) {
      onResult(transcript);
    }
  };

  sr.onend = () => { onEnd?.(); };
  sr.onerror = () => { onEnd?.(); };

  sr.start();
  return sr;
}

/** Stop a running speech recognition instance */
export function stopListening(sr: SpeechRecognitionInstance | null): void {
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
