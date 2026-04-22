'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { speak, startListening, stopListening, isSpeechSupported, getLangCode } from '@/lib/voice';
import { MicIcon, SpeakIcon, CropIcon, DiseaseIcon, MoneyIcon, PlanIcon, LeafIcon, CalendarIcon, SendIcon, CameraIcon, CheckIcon } from '@/components/Icons';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolsUsed?: string[];
  isStreaming?: boolean;
}

interface ThinkingStep {
  message: string;
  done: boolean;
}

const QUICK_PROMPTS = [
  { Icon: CropIcon,    color: '#4ade80', label: 'What to plant?',  text: 'What crop should I plant this season based on my soil and water?' },
  { Icon: DiseaseIcon, color: '#f87171', label: 'Yellow leaves',   text: 'My crop leaves are turning yellow and falling off. What disease could this be?' },
  { Icon: MoneyIcon,   color: '#fbbf24', label: 'Mandi price',     text: 'What is the current mandi price of wheat and rice?' },
  { Icon: PlanIcon,    color: '#a78bfa', label: 'My crop plan',    text: 'Show me my current crop plan and what I should do next.' },
  { Icon: LeafIcon,    color: '#34d399', label: 'Farm status',     text: 'How is my farm doing overall? Give me a complete status update.' },
  { Icon: CalendarIcon,color: '#60a5fa', label: 'Set reminder',    text: 'Remind me to irrigate my fields on Thursday morning.' },
];

const TOOL_ICONS: Record<string, string> = {
  get_farmer_profile: '👤',
  get_crop_plan: '📋',
  get_crop_recommendations: '🌾',
  diagnose_crop_disease: '🔬',
  get_agent_memory: '🧠',
  generate_crop_report: '📊',
  get_mandi_prices: '💰',
  save_reminder: '📝',
};

const TOOL_LABELS: Record<string, string> = {
  get_farmer_profile: 'Read farmer profile',
  get_crop_plan: 'Fetched crop plan',
  get_crop_recommendations: 'Got AI recommendations',
  diagnose_crop_disease: 'Diagnosed disease',
  get_agent_memory: 'Retrieved memory',
  generate_crop_report: 'Generated report',
  get_mandi_prices: 'Checked mandi prices',
  save_reminder: 'Saved reminder',
};

export default function AgentChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: "🌱 Hello! I'm your **SuperFarmer Agentic AI** — I can autonomously fetch your farm data, diagnose diseases, check prices, and more. Just ask me anything!",
      timestamp: '', // filled client-side to avoid SSR hydration mismatch
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  // In-session conversation history — sent to Groq on every turn so it remembers the current chat
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [dictating, setDictating] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setVoiceSupported(isSpeechSupported()); }, []);

  /** Parse numbered/bulleted steps from an AI response */
  function parseSteps(text: string): string[] {
    return text.split('\n')
      .map(l => l.trim())
      .filter(l => /^(\d+[.)]\s|[-*•]\s)/.test(l))
      .map(l => l.replace(/^(\d+[.)]\s|[-*•]\s)/, '').trim())
      .filter(l => l.length > 5);
  }

  /** Start full-screen dictation mode */
  const startDictation = useCallback(() => {
    setDictating(true);
    setLiveTranscript('');
    srRef.current = startListening(
      (text) => { setLiveTranscript(text); setDictating(false); sendMessage(text); },
      () => setDictating(false),
      getLangCode('en')
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopDictation = useCallback(() => {
    stopListening(srRef.current); srRef.current = null;
    setDictating(false); setLiveTranscript('');
  }, []);

  const speakMessage = useCallback((text: string) => {
    speak(text, getLangCode('en'));
  }, []);


  // Auto-send if navigated from voice assistant with ?q= param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      // Clean URL without triggering re-render
      window.history.replaceState({}, '', '/agent-chat');
      setTimeout(() => sendMessage(q), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Set greeting timestamp on client only to avoid SSR/client mismatch
    setMessages((prev) => prev.map((m, i) => i === 0 ? { ...m, timestamp: new Date().toLocaleTimeString() } : m));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingSteps]);

  function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function clearImage() {
    setImagePreview(null);
    setImageBase64(null);
  }

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: question + (imagePreview ? ' 📷 [image attached]' : ''),
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setThinkingSteps([]);
    setToolsUsed([]);
    const sentImage = imageBase64;
    clearImage();

    // Add user turn to in-session history BEFORE the request
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: question },
    ];

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, imageBase64: sentImage, conversationHistory: updatedHistory }),
      });

      if (!res.ok || !res.body) {
        // Fallback for non-streaming response
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: data.error || 'Failed to get a response.', timestamp: new Date().toLocaleTimeString() },
        ]);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'thinking' || event.type === 'tool_start') {
              setThinkingSteps((prev) => [...prev, { message: event.message, done: false }]);
            } else if (event.type === 'tool_done') {
              setThinkingSteps((prev) =>
                prev.map((s, i) => (i === prev.length - 1 ? { ...s, done: true } : s))
              );
            } else if (event.type === 'answer') {
              setToolsUsed(event.toolsUsed || []);
              setMessages((prev) => [
                ...prev,
                {
                  role: 'agent',
                  text: event.message,
                  timestamp: new Date().toLocaleTimeString(),
                  toolsUsed: event.toolsUsed,
                },
              ]);
              // Persist BOTH sides of this turn into session history
              setConversationHistory(updatedHistory.concat([
                { role: 'assistant', content: event.message },
              ]));
              setThinkingSteps([]);
            } else if (event.type === 'error') {
              setMessages((prev) => [
                ...prev,
                { role: 'agent', text: `⚠️ ${event.message}`, timestamp: new Date().toLocaleTimeString() },
              ]);
              setThinkingSteps([]);
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: '⚠️ Connection error. Please try again.', timestamp: new Date().toLocaleTimeString() },
      ]);
      setThinkingSteps([]);
    } finally {
      setLoading(false);
    }
  }

  function formatText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  const showQuickPrompts = messages.length <= 1;

  return (
    <div className="page-container" style={{ maxWidth: 800, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0 }}>🤖 AI Farm Assistant</h1>
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: 999, letterSpacing: '0.08em' }}>
            ⚡ AGENTIC
          </span>
        </div>
        <p>Autonomously calls tools, fetches your farm data, and reasons step-by-step.</p>
      </div>

      {/* Messages */}
      <div
        className="card fade-in"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', marginBottom: '0.75rem', minHeight: 0 }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.5rem', alignItems: 'flex-start' }}>
            {m.role === 'agent' && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, boxShadow: '0 0 14px rgba(124,58,237,0.5)' }}>
                🌱
              </div>
            )}
            <div style={{
              maxWidth: '75%',
              background: m.role === 'user' ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${m.role === 'user' ? 'transparent' : 'var(--glass-border)'}`,
              borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '0.8rem 1.1rem',
              backdropFilter: 'blur(12px)',
              boxShadow: m.role === 'user' ? '0 4px 15px rgba(22,163,74,0.3)' : 'none',
            }}>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formatText(m.text) }} />
              {/* Tools used badges */}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
                  {m.toolsUsed.map((tool, idx) => (
                    <span
                      key={`${tool}-${idx}`}
                      title={TOOL_LABELS[tool] || tool}
                      style={{ fontSize: '0.65rem', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 999, padding: '0.15rem 0.5rem', color: '#c4b5fd' }}
                    >
                      {TOOL_ICONS[tool] || '🔧'} {TOOL_LABELS[tool] || tool}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.3rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.timestamp}
              </div>
            </div>
            {m.role === 'user' && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                🧑‍🌾
              </div>
            )}
          </div>
        ))}

        {/* Live Thinking Panel */}
        {loading && thinkingSteps.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, animation: 'agent-pulse 1.5s ease-in-out infinite', boxShadow: '0 0 14px rgba(124,58,237,0.5)' }}>
              🌱
            </div>
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '18px 18px 18px 4px', padding: '0.9rem 1.1rem', maxWidth: '75%' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                ⚡ AGENTIC AI WORKING...
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {thinkingSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: step.done ? '#86efac' : 'var(--text)' }}>
                    <span style={{ flexShrink: 0, fontSize: '0.75rem' }}>
                      {step.done ? '✅' : i === thinkingSteps.length - 1 ? '⟳' : '✅'}
                    </span>
                    <span style={{ opacity: step.done ? 0.8 : 1 }}>{step.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Simple typing indicator when loading but no steps yet */}
        {loading && thinkingSteps.length === 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', animation: 'agent-pulse 1.5s ease-in-out infinite' }}>🌱</div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '18px 18px 18px 4px', padding: '0.75rem 1.25rem', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 1, 2].map((n) => (
                <div key={n} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-400)', animation: 'bounce 1.2s infinite', animationDelay: `${n * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {showQuickPrompts && (
        <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.06em' }}>⚡ QUICK QUESTIONS</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.text)}
                disabled={loading}
                style={{
                  background: `${q.color}0d`,
                  border: `1px solid ${q.color}30`,
                  borderRadius: 10, padding: '0.6rem 0.75rem',
                  color: 'var(--text)', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.8rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  transition: 'all 0.15s', minHeight: 44,
                }}
              >
                <q.Icon size={16} color={q.color} />
                <span>{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dictation Modal */}
      {dictating && (
        <div
          onClick={stopDictation}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(3,10,5,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
          }}
        >
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 16px rgba(220,38,38,0.15)', animation: 'voice-listen 1s ease-in-out infinite' }}>
            <MicIcon size={44} color="#fff" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.3rem' }}>Listening…</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>Tap anywhere to cancel</div>
          </div>
          {liveTranscript && (
            <div style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 14, padding: '0.85rem 1.25rem', maxWidth: '80vw', textAlign: 'center', fontSize: '1rem', color: '#86efac', lineHeight: 1.5 }}>
              &ldquo;{liveTranscript}&rdquo;
            </div>
          )}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 36 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 4, borderRadius: 999, background: '#f87171', animation: 'wave 1s ease-in-out infinite', animationDelay: `${i*0.1}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Image preview strip */}
      {imagePreview && (
        <div style={{ flexShrink: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '0.5rem 0.75rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="attached" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ color: '#a78bfa', fontWeight: 700 }}>Image attached</span> — AI will use Gemini Vision to analyse this photo
          </div>
          <button onClick={clearImage} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 0.25rem', display: 'flex' }} title="Remove image">
            <CheckIcon size={16} color="#f87171" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
        style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}
      >
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageAttach} />

        {/* Camera attach button */}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}
          title="Attach crop photo" style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
            background: imagePreview ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${imagePreview ? 'rgba(124,58,237,0.6)' : 'var(--glass-border)'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}>
          <CameraIcon size={18} color={imagePreview ? '#a78bfa' : 'rgba(255,255,255,0.4)'} />
        </button>

        {/* Mic dictation button */}
        {voiceSupported && (
          <button type="button" onClick={startDictation} disabled={loading || dictating}
            title="Tap to speak" style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(74,222,128,0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
            <MicIcon size={18} color="#4ade80" />
          </button>
        )}

        <input className="form-control" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={imagePreview ? 'Describe the photo…' : 'Ask anything about your farm…'}
          disabled={loading} style={{ flex: 1, borderRadius: 999, paddingLeft: '1.25rem' }} autoFocus />

        <button className="btn" type="submit" disabled={loading || (!input.trim() && !imagePreview)}
          style={{ borderRadius: 999, padding: '0 1.25rem', minWidth: 48, height: 44, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 15px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <span className="spinner" /> : <SendIcon size={18} color="#fff" />}
        </button>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
          40% { transform: scale(1.4); opacity: 1; }
        }
        @keyframes agent-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(124,58,237,0.4); }
          50% { box-shadow: 0 0 20px rgba(124,58,237,0.8); }
        }
        @keyframes wave {
          0%, 100% { height: 6px; }
          50% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
