// src/app/intake/IntakeForm.tsx — Client-only form component
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', land_size: '', location: '', water: 'Adequate', goals: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) router.push('/');
    else setError(data.error || 'Failed to save profile');
  }

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1>🏡 Farm Profile Setup</h1>
        <p>Tell us about your farm so we can tailor our AI recommendations.</p>
      </div>
      <div className="card fade-in">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input className="form-control" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Ramesh Kumar" required />
          </div>
          <div className="input-row">
            <div className="form-group">
              <label>Land Size (acres)</label>
              <input className="form-control" type="number" step="0.1" value={form.land_size} onChange={e => update('land_size', e.target.value)} placeholder="e.g. 5.5" required />
            </div>
            <div className="form-group">
              <label>Location / Village</label>
              <input className="form-control" value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Indore, MP" required />
            </div>
          </div>
          <div className="form-group">
            <label>Water Availability</label>
            <select className="form-control" value={form.water} onChange={e => update('water', e.target.value)}>
              <option>Rainfed only</option>
              <option>Borewell</option>
              <option>Canal irrigation</option>
              <option>Adequate</option>
              <option>Water-stressed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Farming Goals</label>
            <textarea className="form-control" rows={3} value={form.goals} onChange={e => update('goals', e.target.value)} placeholder="e.g. Maximize yield, reduce input cost, grow organically..." required style={{ resize: 'vertical' }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <><span className="spinner" /> Saving...</> : 'Continue to Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
}
