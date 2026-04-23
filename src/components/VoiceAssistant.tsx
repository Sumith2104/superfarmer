'use client';
// src/components/VoiceAssistant.tsx
// Global voice assistant — large, friendly, farmer-first design
// Single tap = speak to AI | Listening modal shows full transcript

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  startListening, stopListening, speak, stopSpeaking,
  isSpeechSupported, getLangCode,
} from '@/lib/voice';
import { MicIcon, SpeakIcon } from './Icons';

const PAGE_SUMMARIES: Record<string, string> = {
  '/': 'This is your farm dashboard. It shows your farm status, todays tasks, and AI recommendations.',
  '/recommendation': 'Crop recommendation page. AI will suggest the best crops for your soil and weather.',
  '/disease': 'Disease diagnosis page. Take a photo of your crop leaves to detect diseases.',
  '/plan': 'Crop planning page. See your farming schedule and upcoming tasks.',
  '/spatial-planner': 'Spatial twin page. Draw your field boundary on the satellite map.',
  '/agent-chat': 'AI assistant. Ask me anything about your farm.',
  '/profile': 'Farmer profile page. Fill in your details so AI can help you better.',
  '/memory': 'AI memory page. See everything the AI has done for your farm.',
};

export default function VoiceAssistant({ lang = 'en' }: { lang?: string }) {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const srRef = useRef<ReturnType<typeof startListening>>(null);
  const pathname = usePathname();
  const router = useRouter();
  const langCode = getLangCode(lang);

  useEffect(() => {
    const t = setTimeout(() => setSupported(isSpeechSupported()), 0);
    return () => clearTimeout(t);
  }, []);

  const stopVoice = useCallback(() => {
    stopListening(srRef.current);
    srRef.current = null;
    setListening(false);
    setShowModal(false);
    setTranscript('');
  }, []);

  const sendToChat = useCallback((text: string) => {
    setListening(false);
    setShowModal(false);
    setThinking(true);
    setTranscript('');
    router.push(`/agent-chat?q=${encodeURIComponent(text)}`);
    setTimeout(() => setThinking(false), 2000);
  }, [router]);

  const startVoice = useCallback(() => {
    stopSpeaking();
    setListening(true);
    setShowModal(true);
    setTranscript('');
    srRef.current = startListening(
      (text) => { setTranscript(text); sendToChat(text); },
      () => { setListening(false); setShowModal(false); },
      langCode
    );
  }, [langCode, sendToChat]);

  const handleFABPress = useCallback(() => {
    if (listening) { stopVoice(); return; }
    if (thinking) return;
    startVoice();
  }, [listening, thinking, startVoice, stopVoice]);

  const readPage = useCallback(() => {
    const s = PAGE_SUMMARIES[pathname] ?? 'Welcome to SuperFarmer AI.';
    speak(s, langCode);
  }, [pathname, langCode]);

  if (!supported) return null;

  // FAB appearance
  const fabBg = listening
    ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
    : thinking
    ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
    : 'linear-gradient(135deg,#16a34a,#15803d)';

  const fabShadow = listening
    ? '0 4px 24px rgba(220,38,38,0.6)'
    : thinking
    ? '0 4px 24px rgba(124,58,237,0.6)'
    : '0 4px 24px rgba(22,163,74,0.5)';

  return (
    <>
      {/* ── Listening Modal Overlay ── */}
      {showModal && (
        <div
          onClick={stopVoice}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(3,10,5,0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
          }}
        >
          {/* Animated mic ring */}
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            {/* Outer pulse ring */}
            <div style={{
              position: 'absolute', inset: -16,
              borderRadius: '50%',
              border: '2px solid rgba(239,68,68,0.4)',
              animation: 'voice-listen 1s ease-in-out infinite',
            }} />
            {/* Inner ring */}
            <div style={{
              position: 'absolute', inset: -6,
              borderRadius: '50%',
              border: '2px solid rgba(239,68,68,0.6)',
              animation: 'voice-listen 1s ease-in-out infinite',
              animationDelay: '0.15s',
            }} />
            {/* Mic circle */}
            <div style={{
              width: 120, height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(220,38,38,0.5)',
            }}>
              <MicIcon size={52} color="#fff" />
            </div>
          </div>

          {/* Listening label */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
              Listening…
            </div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
              Tap anywhere to cancel
            </div>
          </div>

          {/* Live transcript */}
          {transcript && (
            <div style={{
              background: 'rgba(22,163,74,0.15)',
              border: '1px solid rgba(74,222,128,0.35)',
              borderRadius: 16,
              padding: '1rem 1.5rem',
              maxWidth: '80vw',
              textAlign: 'center',
              fontSize: '1.1rem',
              color: '#86efac',
              lineHeight: 1.5,
            }}>
              &ldquo;{transcript}&rdquo;
            </div>
          )}

          {/* Wave animation */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 40 }}>
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                width: 4, borderRadius: 999,
                background: '#f87171',
                animation: 'wave 1s ease-in-out infinite',
                animationDelay: `${i * 0.08}s`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main FAB ── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-h) + 16px + env(safe-area-inset-bottom))',
        right: 16,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
      }}>
        <button
          onClick={handleFABPress}
          title="Tap to speak to AI"
          style={{
            width: 64, height: 64,
            borderRadius: '50%',
            border: 'none',
            cursor: thinking ? 'wait' : 'pointer',
            background: fabBg,
            boxShadow: fabShadow,
            fontSize: '1.6rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: listening ? 'voice-listen 1s ease-in-out infinite' : 'voice-pulse 3s ease-in-out infinite',
            transition: 'background 0.3s, box-shadow 0.3s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {thinking ? '⏳' : <MicIcon size={28} color="#fff" />}
        </button>

        {/* Label below FAB */}
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          color: listening ? '#f87171' : thinking ? '#c4b5fd' : '#4ade80',
          letterSpacing: '0.05em',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          background: 'rgba(6,13,8,0.7)',
          padding: '0.15rem 0.5rem',
          borderRadius: 999,
          backdropFilter: 'blur(6px)',
        }}>
          {listening ? 'LISTENING' : thinking ? 'THINKING' : 'SPEAK'}
        </span>
      </div>

      {/* Read page FAB — smaller, left of mic */}
      <button
        onClick={readPage}
        title="Hear this page"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-h) + 28px + env(safe-area-inset-bottom))',
          right: 92,
          width: 44, height: 44,
          borderRadius: '50%',
          border: '1.5px solid rgba(74,222,128,0.3)',
          background: 'rgba(6,13,8,0.85)',
          color: '#4ade80',
          fontSize: '1.1rem',
          cursor: 'pointer',
          zIndex: 200,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <SpeakIcon size={20} color="#4ade80" />
      </button>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 32px; }
        }
      `}</style>
    </>
  );
}
