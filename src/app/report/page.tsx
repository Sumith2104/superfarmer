'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ReportData } from '@/lib/agents/report-agent';

// Load PDF component client-side only
const ReportPDFButton = dynamic(() => import('@/components/ReportPDF'), { ssr: false });

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [farmerName, setFarmerName] = useState('SuperFarmer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => { if (p.profile?.name) setFarmerName(p.profile.name); });

    fetch('/api/report')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to generate report'); setLoading(false); });
  }, []);

  const getPhaseIcon = (p: string) => {
    if (p.includes('Prep')) return '🚜';
    if (p.includes('Sow')) return '🌱';
    if (p.includes('Grow')) return '🌿';
    if (p.includes('Protect')) return '🛡️';
    return '🧺';
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄 Farm Advisory Report</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Consolidated intelligence from all farm monitoring agents.</p>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
          <span className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
          <h2 style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>Synthesizing All Agent Data...</h2>
          <p style={{ color: 'var(--text-muted)' }}>Nutrient + Weather + Disease + Spatial Engines are calculating...</p>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <div className="fade-in">
          {/* Certificate Header */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--green-400)', marginBottom: '2rem', boxShadow: 'var(--shadow)' }}>
            {/* Hero Banner */}
            <div style={{
              height: 140,
              background: 'linear-gradient(135deg, var(--green-600), var(--green-400))',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }}>
              <div style={{ padding: '0.25rem 1.2rem', background: 'rgba(255,255,255,0.25)', borderRadius: 99, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', color: '#fff', marginBottom: '0.75rem' }}>
                OFFICIAL ADVISORY
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: 0 }}>Certified Crop Insight</h2>
              <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem' }}>
                Prepared for {farmerName} • {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                {/* Strategic Overview */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--green-600)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                    📊 Strategic Overview
                  </h3>
                  <div
                    style={{ fontSize: '0.95rem', lineHeight: 1.85, color: 'var(--text)' }}
                    dangerouslySetInnerHTML={{
                      __html: typeof data.report === 'string'
                        ? data.report
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        : 'Report content unavailable.'
                    }}
                  />
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Immediate Actions */}
                  <div style={{ padding: '1.25rem', background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 12 }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--green-600)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      ✅ Immediate Action Items
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {data.sections?.action_items?.map
                        ? data.sections.action_items.map((item, i) => <li key={i}>{item}</li>)
                        : <li>No immediate actions recorded.</li>
                      }
                    </ul>
                  </div>

                  {/* Stats mini cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12 }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 600 }}>Nutrient Status</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--green-600)' }}>
                        {data.sections?.nutrient_status?.split ? data.sections.nutrient_status.split('.')[0] : 'Normal'}.
                      </div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12 }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 600 }}>Weather Alert</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0369a1' }}>
                        {data.sections?.weather_summary?.split ? data.sections.weather_summary.split('.')[0] : 'Stable'}.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Crop Lifecycle Timeline */}
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text)' }}>
              <span style={{ padding: '0.5rem', background: 'rgba(22,163,74,0.12)', borderRadius: 10 }}>📐</span>
              Seeding to Harvest: Optimized Lifecycle
            </h3>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 24, top: 20, bottom: 20, width: 2, background: 'linear-gradient(to bottom, var(--green-400), #0ea5e9)', opacity: 0.4 }} />

              {data.crop_lifecycle?.map ? data.crop_lifecycle.map((phase, i) => {
                const isComplete = phase.status?.toLowerCase().includes('comp');
                return (
                  <div key={i} style={{ position: 'relative', display: 'flex', gap: '1.5rem', paddingLeft: '3rem' }}>
                    {/* Phase dot */}
                    <div style={{
                      position: 'absolute', left: 10, top: 0,
                      width: 30, height: 30, borderRadius: '50%',
                      background: isComplete ? 'var(--green-400)' : '#fff',
                      border: `3px solid ${isComplete ? 'var(--green-400)' : 'var(--glass-border)'}`,
                      boxShadow: isComplete ? '0 0 0 4px rgba(74,222,128,0.2)' : 'none',
                      zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                    }}>
                      {getPhaseIcon(phase.phase || '')}
                    </div>

                    <div style={{ flex: 1, padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--glass-border)', borderRadius: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{phase.phase}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{phase.duration}</span>
                        </div>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800,
                          background: isComplete ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.05)',
                          color: isComplete ? 'var(--green-600)' : 'var(--text-muted)',
                          border: `1px solid ${isComplete ? 'rgba(22,163,74,0.3)' : 'var(--glass-border)'}`
                        }}>
                          {(phase.status || 'Upcoming').toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: 'var(--text)', borderLeft: '3px solid var(--green-400)', paddingLeft: '1rem', marginBottom: '1rem' }}>
                        <strong>🎯 Perfect Outcome:</strong> {phase.outcome_goal}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {phase.action_items?.map ? phase.action_items.map((action, j) => (
                          <span key={j} style={{ padding: '0.3rem 0.75rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--green-600)' }}>
                            🔹 {action}
                          </span>
                        )) : <span style={{ color: 'var(--text-muted)' }}>No specific actions for this phase.</span>}
                      </div>
                    </div>
                  </div>
                );
              }) : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Lifecycle data unavailable.</div>}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
            <Link href="/" className="btn btn-secondary">🏠 Dashboard</Link>
            <ReportPDFButton data={data} farmerName={farmerName} />
          </div>
        </div>
      )}
    </div>
  );
}
