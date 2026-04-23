'use client';
import { useEffect, useRef, useState } from 'react';

interface DiseaseProduct {
  name: string;
  type: string;
  dose: string;
  searchQuery: string;
}

interface DiagResult {
  diagnosis: string;
  confidence: string;
  treatment: string;
  prevention: string;
  products: DiseaseProduct[];
}

function getProductIcon(type: string) {
  if (type?.includes('Fungicide')) return '🍄';
  if (type?.includes('Pesticide')) return '🐛';
  if (type?.includes('Fertilizer')) return '🧪';
  return '🛒';
}

const IDLE_TIPS = [
  '📸 Upload a clear photo of the affected leaf for best results',
  '🎤 You can also speak your symptoms using the microphone button',
  '🔬 Our AI can identify 50+ common crop diseases',
  '⚡ Powered by Gemini Vision — analysis takes under 20 seconds',
];

export default function DiseasePage() {
  const [leafText, setLeafText] = useState('');
  const [leafImage, setLeafImage] = useState<File | null>(null);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Pick random tip only on client to avoid SSR hydration mismatch
  useEffect(() => {
    const t = setTimeout(() => setTipIndex(Math.floor(Math.random() * IDLE_TIPS.length)), 0);
    return () => clearTimeout(t);
  }, []);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setLeafImage(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: any = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === 'not-allowed') alert('Microphone access denied! Please click the lock icon in your browser URL bar and allow microphone access.');
      else if (e.error === 'network') alert('Microphone access requires a secure connection.');
      else if (e.error !== 'no-speech') alert('Microphone error: ' + (e.error || 'Try using Google Chrome.'));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setLeafText((prev) => prev + (prev ? ' ' : '') + transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leafText && !leafImage) { setError('Please describe symptoms or upload a leaf image.'); return; }
    setLoading(true); setError(''); setResult(null);

    let base64 = '';
    if (leafImage) {
      base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(leafImage);
      });
    }

    try {
      const res = await fetch('/api/disease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: leafText, imageBase64: base64, cropType: 'Any' }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setResult({
          diagnosis: data.diagnosis,
          confidence: data.confidence,
          treatment: data.treatment,
          prevention: data.prevention,
          products: data.products || [],
        });
      } else {
        setError(data.error || 'Diagnosis failed');
      }
    } catch {
      setLoading(false);
      setError('Connection failed. Please check your internet.');
    }
  }

  // Parse confidence to a number
  function parseConfidence(conf: string): number {
    const match = conf?.match(/(\d+)/);
    return match ? Math.min(100, Number(match[1])) : 75;
  }

  const confNum = result ? parseConfidence(result.confidence) : 0;
  const confColor = confNum >= 80 ? '#22c55e' : confNum >= 60 ? '#fbbf24' : '#ef4444';

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <h1>🔬 Disease &amp; Pest Auto-Diagnosis</h1>
        <p>Describe your crop&apos;s symptoms or upload an image — our AI Vision Agent will identify the pathology.</p>
      </div>

      <div className="two-col">
        {/* Form */}
        <div className="card fade-in">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Symptom Description</label>
              <textarea
                className="form-control"
                rows={5}
                value={leafText}
                onChange={(e) => setLeafText(e.target.value)}
                placeholder="e.g. The lower leaves on my tomato plant are turning pale yellow with dark brown concentric rings, and some are falling off..."
                style={{ resize: 'vertical', paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={toggleMic}
                title="Tap to Speak"
                style={{
                  position: 'absolute', right: 10, bottom: 12,
                  background: isListening ? '#fecaca' : 'rgba(22,163,74,0.2)',
                  border: `1px solid ${isListening ? '#ef4444' : 'rgba(74,222,128,0.3)'}`,
                  borderRadius: '50%', width: 36, height: 36,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                  transition: 'all 0.2s',
                }}
              >
                {isListening ? '🛑' : '🎤'}
              </button>
            </div>

            <div className="form-group">
              <label>Upload Leaf Image (optional)</label>
              <input className="form-control" type="file" accept="image/*" onChange={handleImage} />
            </div>

            {preview && (
              <div style={{ marginBottom: '1rem', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--glass-border)', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="leaf preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#fff' }}>
                  🔬 Gemini Vision will analyze this
                </div>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}>
              {loading ? <><span className="spinner" /> Analyzing with AI Vision...</> : '🤖 Run AI Diagnosis'}
            </button>

            {loading && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>🔍 Scanning leaf patterns...</p>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div className="loading-bar" />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Result panel */}
        <div>
          {result ? (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Disease name + confidence */}
              <div className="card" style={{ borderLeft: '4px solid #22c55e', padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>🦠 DIAGNOSIS</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>{result.diagnosis}</h2>

                <div style={{ marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Confidence Level</span>
                  <span style={{ fontWeight: 700, color: confColor }}>{result.confidence}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${confNum}%`, background: `linear-gradient(90deg, ${confColor}, ${confColor}aa)`, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Treatment */}
              {result.treatment && (
                <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>💊 TREATMENT</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.7 }}>
                    {result.treatment.split(/[\n•-]/).filter(Boolean).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                        <span>{step.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prevention */}
              {result.prevention && (
                <div className="card" style={{ borderLeft: '4px solid #818cf8', padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>🛡️ PREVENTION</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.7 }}>
                    {result.prevention.split(/[\n•-]/).filter(Boolean).map((tip, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#818cf8', flexShrink: 0 }}>✓</span>
                        <span>{tip.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buy Products */}
              {result.products && result.products.length > 0 && (
                <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em', marginBottom: '1rem' }}>🛒 RECOMMENDED SOLUTIONS & PRODUCTS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {result.products.map((p, i) => {
                      const isOrganic = p.type.toLowerCase().includes('bio') || p.type.toLowerCase().includes('organic');
                      const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(p.searchQuery)}`;
                      return (
                        <a
                          key={i}
                          href={amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: isOrganic ? 'rgba(22,163,74,0.07)' : 'rgba(245,158,11,0.06)', border: `1px solid ${isOrganic ? 'rgba(74,222,128,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 10, padding: '0.85rem 1rem', textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.background = isOrganic ? 'rgba(22,163,74,0.14)' : 'rgba(245,158,11,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = isOrganic ? 'rgba(22,163,74,0.07)' : 'rgba(245,158,11,0.06)'; }}
                        >
                          <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{getProductIcon(p.type)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>{p.name}</span>
                              {isOrganic && <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(22,163,74,0.2)', color: '#4ade80', padding: '0.1rem 0.45rem', borderRadius: 999 }}>🍃 ORGANIC</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              <span>{p.type}</span>
                              {p.dose && <span>• 💊 {p.dose}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            Buy on Amazon <span>→</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.85rem', lineHeight: 1.5 }}>
                    🔗 Links open Amazon India search for these products. Always consult your local agricultural officer before applying chemicals.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card fade-in" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--glass-border)', background: 'transparent', textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔬</div>
              <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>AI Vision Lab Ready</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 240, lineHeight: 1.6 }}>
                {IDLE_TIPS[tipIndex]}
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', flex: 'column', gap: '0.5rem', flexDirection: 'column', width: '100%', maxWidth: 280 }}>
                {IDLE_TIPS.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: i === tipIndex ? 1 : 0.4, transition: 'opacity 0.3s', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: i === tipIndex ? 'var(--green-400)' : 'var(--text-muted)', flexShrink: 0 }} />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .loading-bar {
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, transparent, #22c55e, transparent);
          animation: loading-sweep 1.5s ease-in-out infinite;
        }
        @keyframes loading-sweep {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
