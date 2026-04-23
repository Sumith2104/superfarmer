'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CropItem {
  name: string;
  reason: string;
  care_tip: string;
  growing_days?: string;
  market_price?: string;
  profit_potential?: 'Low' | 'Medium' | 'High';
  confidence?: 'Highly Recommended' | 'Recommended' | 'Worth Considering';
}
interface RecResult {
  primary_crop: string;
  crops: CropItem[];
  overall_advice: string;
  ai_powered: boolean;
}

const CROP_EMOJI: Record<string, string> = {
  Cotton: '🌸', Rice: '🍚', Paddy: '🍚', Wheat: '🌾', Sugarcane: '🎋',
  Maize: '🌽', Corn: '🌽', Groundnut: '🥜', Soybean: '🫘', Sorghum: '🌿',
  Millet: '🌿', Millets: '🌿', Tomato: '🍅', Tomatoes: '🍅', Potato: '🥔',
  Onion: '🧅', Chickpea: '🫘', Lentil: '🫘', Sunflower: '🌻', Mustard: '🌼',
  Jowar: '🌿', Bajra: '🌿', Turmeric: '🫚', Ginger: '🫚', Garlic: '🧄',
  Peas: '🫛', Beans: '🫘', 'French Beans': '🫘',
};

function getCropEmoji(name: string) {
  for (const [key, emoji] of Object.entries(CROP_EMOJI)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🌱';
}

const PROFIT_COLOR = {
  High: { bg: 'rgba(22,163,74,0.2)', text: '#4ade80', bar: '#22c55e' },
  Medium: { bg: 'rgba(234,179,8,0.15)', text: '#fbbf24', bar: '#f59e0b' },
  Low: { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', bar: '#ef4444' },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  'Highly Recommended': '#22c55e',
  'Recommended': '#a3e635',
  'Worth Considering': '#fbbf24',
};

export default function RecommendationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    soil_type: 'Black',
    water_const: 'Medium',
    season: 'Kharif (June-October, Monsoon)',
    goal: 'Maximum yield and profit',
    farm_size: '',
    location: '',
  });
  const [result, setResult] = useState<RecResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  function update(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    const res = await fetch('/api/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setResult(data);
    else setError(data.error || 'Failed to get recommendation.');
  }

  async function generatePlan(cropName: string) {
    setPlanLoading(cropName);
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_name: cropName }),
    });
    setPlanLoading(null);
    if (res.ok) router.push('/plan');
    else if (res.status === 401) router.push('/intake');
  }

  // Helper to get confidence from index
  function getConfidence(i: number, crop: CropItem): string {
    if (crop.confidence) return crop.confidence;
    if (i === 0) return 'Highly Recommended';
    if (i === 1) return 'Recommended';
    return 'Worth Considering';
  }

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <h1>🌾 AI Crop Recommendations</h1>
        <p>Answer a few simple questions about your farm. Our AI Agronomist will suggest the best crops for you.</p>
      </div>

      <div className="form-result-grid">
        {/* FORM */}
        <div className="card fade-in" style={{ alignSelf: 'start' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>What type of soil do you have?</label>
              <select className="form-control" value={form.soil_type} onChange={(e) => update('soil_type', e.target.value)}>
                <option value="Black">⬛ Black Soil (Dark, heavy, moisture-retaining)</option>
                <option value="Red">🟥 Red Soil (Thin, reddish, iron-rich)</option>
                <option value="Alluvial">🟫 Alluvial Soil (Fertile, found near rivers)</option>
                <option value="Laterite">🟤 Laterite Soil (Rocky, hilly regions)</option>
                <option value="Sandy">🟡 Sandy Soil (Dry, loose, drains fast)</option>
                <option value="Clay">🔵 Clay Soil (Heavy, sticky when wet)</option>
              </select>
            </div>

            <div className="form-group">
              <label>How much water/irrigation do you have?</label>
              <select className="form-control" value={form.water_const} onChange={(e) => update('water_const', e.target.value)}>
                <option value="Low">💧 Low — Only rainwater, no irrigation</option>
                <option value="Medium">💧💧 Medium — Some irrigation available</option>
                <option value="High">💧💧💧 High — Good irrigation / near water source</option>
              </select>
            </div>

            <div className="form-group">
              <label>What season are you planting in?</label>
              <select className="form-control" value={form.season} onChange={(e) => update('season', e.target.value)}>
                <option value="Kharif (June-October, Monsoon)">☔ Kharif (June–Oct, Monsoon)</option>
                <option value="Rabi (November-March, Winter)">❄️ Rabi (Nov–Mar, Winter)</option>
                <option value="Zaid (March-June, Summer)">☀️ Zaid (Mar–Jun, Summer)</option>
              </select>
            </div>

            <div className="form-group">
              <label>What is your main goal?</label>
              <select className="form-control" value={form.goal} onChange={(e) => update('goal', e.target.value)}>
                <option value="Maximum yield and profit">💰 Maximum yield and profit</option>
                <option value="Low water usage and drought resistance">🌵 Low water usage (drought-resistant crops)</option>
                <option value="Soil health improvement">🌿 Improve soil health (green manure / legumes)</option>
                <option value="Fastest harvest time">⚡ Fastest harvest time</option>
                <option value="Organic farming">🍃 Organic farming methods</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Farm Size (optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. 2 acres"
                  value={form.farm_size}
                  onChange={(e) => update('farm_size', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location (optional)</label>
                <input
                  className="form-control"
                  placeholder="e.g. Pune, MH"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}>
              {loading ? <><span className="spinner" /> Consulting AI Agronomist...</> : '🤖 Get AI Recommendation'}
            </button>

            {loading && (
              <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                ✨ Our AI is analyzing your soil, water, season & goal...
              </p>
            )}
          </form>
        </div>

        {/* RESULTS */}
        {result && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {result.ai_powered && (
                <span className="ai-badge">✨ AI POWERED</span>
              )}
              <h3 style={{ margin: 0, color: 'var(--green-400)', fontSize: '1.15rem', fontWeight: 700 }}>Crop Recommendations</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              {result.crops.map((crop, i) => {
                const confidence = getConfidence(i, crop);
                const profit = crop.profit_potential || (i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low');
                const profitStyle = PROFIT_COLOR[profit];
                const confColor = CONFIDENCE_COLOR[confidence] || '#a3e635';
                return (
                  <div
                    key={i}
                    style={{
                      background: i === 0 ? 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(15,26,18,0.8))' : 'var(--glass)',
                      border: `1px solid ${i === 0 ? 'rgba(74,222,128,0.4)' : 'var(--glass-border)'}`,
                      borderRadius: 14,
                      padding: '1.25rem 1.5rem',
                      position: 'relative',
                      backdropFilter: 'blur(12px)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    className="rec-card"
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '2.2rem' }}>{getCropEmoji(crop.name)}</span>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{crop.name}</div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: confColor, background: `${confColor}22`, padding: '0.15rem 0.6rem', borderRadius: 999, letterSpacing: '0.04em' }}>
                            {confidence.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {i === 0 && (
                        <span style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: 999, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          🏆 TOP PICK
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>DURATION</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{crop.growing_days || (i === 0 ? '90–120 days' : i === 1 ? '80–100 days' : '60–90 days')}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>MANDI PRICE</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{crop.market_price || '₹ Market rate'}</div>
                      </div>
                      <div style={{ background: profitStyle.bg, borderRadius: 8, padding: '0.5rem 0.65rem', textAlign: 'center', border: `1px solid ${profitStyle.text}33` }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>PROFIT</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: profitStyle.text }}>{profit}</div>
                      </div>
                    </div>

                    {/* Reason */}
                    {crop.reason && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        {crop.reason}
                      </p>
                    )}

                    {/* Care tip */}
                    {crop.care_tip && (
                      <div style={{ background: 'rgba(22,163,74,0.08)', borderLeft: '3px solid #22c55e', padding: '0.5rem 0.75rem', borderRadius: '0 8px 8px 0', fontSize: '0.82rem', color: 'var(--green-300)', marginBottom: '1rem', lineHeight: 1.4 }}>
                        💡 {crop.care_tip}
                      </div>
                    )}

                    {/* Plan CTA */}
                    <button
                      className="btn btn-primary"
                      onClick={() => generatePlan(crop.name)}
                      disabled={planLoading !== null}
                      style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.65rem' }}
                    >
                      {planLoading === crop.name ? <><span className="spinner" /> Generating Plan...</> : `📋 Generate Full Plan for ${crop.name} →`}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Agronomist advice */}
            {result.overall_advice && (
              <div className="card" style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.25)', padding: '1.1rem 1.4rem' }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem', fontSize: '0.9rem' }}>🧑‍🌾 Agronomist&apos;s Overall Advice</div>
                <p style={{ margin: 0, color: '#fde68a', fontSize: '0.88rem', lineHeight: 1.7 }}>{result.overall_advice}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .rec-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(22,163,74,0.15); }
        .ai-badge {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          letter-spacing: 0.05em;
          animation: pulse-badge 2s ease-in-out infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
        }
      `}</style>
    </div>
  );
}
