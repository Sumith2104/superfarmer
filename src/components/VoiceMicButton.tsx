'use client';
// src/components/VoiceMicButton.tsx — Inline mic button for form fields

import { useState, useRef, useEffect } from 'react';
import { startListening, stopListening, isSpeechSupported } from '@/lib/voice';
import { MicIcon, MicOffIcon } from './Icons';

interface Props {
  onResult: (text: string) => void;
  lang?: string;
  size?: number;
}

export default function VoiceMicButton({ onResult, lang = 'en-IN', size = 42 }: Props) {
  // ⚠️ Must use state + effect — NOT a direct isSpeechSupported() call in render.
  // Direct calls check `typeof window` which differs between server and client → hydration error.
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setSupported(isSpeechSupported()), 0);
    return () => clearTimeout(t);
  }, []);

  // Don't render anything until we know speech is supported (client-only)
  if (!supported) return null;

  function toggle() {
    if (listening) {
      stopListening(srRef.current);
      srRef.current = null;
      setListening(false);
    } else {
      setListening(true);
      srRef.current = startListening(
        (text) => { onResult(text); setListening(false); },
        () => setListening(false),
        lang
      );
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Tap to stop' : 'Tap to speak'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1.5px solid ${listening ? 'rgba(239,68,68,0.6)' : 'rgba(74,222,128,0.4)'}`,
        background: listening ? 'rgba(239,68,68,0.15)' : 'rgba(22,163,74,0.12)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        animation: listening ? 'voice-listen 1s ease-in-out infinite' : undefined,
        transition: 'all 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {listening
        ? <MicOffIcon size={Math.round(size * 0.45)} color="#f87171" />
        : <MicIcon    size={Math.round(size * 0.45)} color="#4ade80" />
      }
    </button>
  );
}
