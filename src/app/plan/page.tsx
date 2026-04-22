'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Plan {
  plan_id: number;
  crop_name: string;
  status?: string;
  sowing_schedule: string;
  irrigation_plan: string;
  fertilizer_schedule: string;
  pest_alerts: string;
  harvest_timeline: string;
}

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to load latest plan from DB via a GET endpoint
    fetch('/api/plan')
      .then((r) => r.json())
      .then((d) => { if (d.plan) setPlan(d.plan); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const crop_name = fd.get('crop_name') as string;
    setLoading(true);
    const res = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ crop_name }) });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setPlan({ crop_name, status: 'Active', plan_id: data.plan_id, ...data });
    else if (res.status === 401) router.push('/intake');
    else setError(data.error || 'Failed');
  }

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>📅 Crop Plan Dashboard</h1>
        <p>Our Planner Agent generates a tailored schedule for your crop.</p>
      </div>

      {!plan && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '0.75rem' }}>
            <input className="form-control" name="crop_name" placeholder="Enter crop name (e.g. Wheat, Corn, Rice...)" required style={{ flex: 1 }} />
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? <span className="spinner" /> : '📋 Generate Plan'}
            </button>
          </form>
        </div>
      )}

      {loading && !plan && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
      )}

      {plan && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--green-400)' }}>Plan: {plan.crop_name}</h2>
              <span style={{ background: 'rgba(22,163,74,0.15)', color: 'var(--green-400)', border: '1px solid rgba(74,222,128,0.3)', padding: '0.3rem 0.8rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
                {plan.status || 'Active'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {[
                { icon: '🌱', label: 'Sowing Schedule', value: plan.sowing_schedule },
                { icon: '💧', label: 'Irrigation Plan', value: plan.irrigation_plan },
                { icon: '🧪', label: 'Fertilizer Schedule', value: plan.fertilizer_schedule },
                { icon: '🌾', label: 'Harvest Timeline', value: plan.harvest_timeline },
              ].map((item) => (
                <div key={item.label} style={{ background: 'rgba(15,26,18,0.6)', padding: '1rem', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>{item.value}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', background: 'rgba(239,68,68,0.08)', padding: '1rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>🐛 Pest Alerts</div>
                <div style={{ fontSize: '0.92rem', color: '#fca5a5', lineHeight: 1.5 }}>{plan.pest_alerts}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/nutrient-risk" className="btn btn-primary">Proceed to Nutrient Monitoring →</Link>
            <button className="btn btn-secondary" onClick={() => setPlan(null)}>Generate New Plan</button>
          </div>
        </div>
      )}
    </div>
  );
}
