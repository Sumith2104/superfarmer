'use client';
// src/app/profile/page.tsx — Farmer onboarding wizard
// Voice-first, icon-based, mobile-optimised

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import VoiceMicButton from '@/components/VoiceMicButton';
import { speak, getLangCode } from '@/lib/voice';

const SOIL_TYPES = [
  { value: 'Black', emoji: '⬛', label: 'Black Soil' },
  { value: 'Red', emoji: '🔴', label: 'Red Soil' },
  { value: 'Loam', emoji: '🟫', label: 'Loam Soil' },
  { value: 'Sandy', emoji: '🏖️', label: 'Sandy Soil' },
  { value: 'Clay', emoji: '🧱', label: 'Clay Soil' },
];
const IRRIGATION = [
  { value: 'Drip', emoji: '💧', label: 'Drip' },
  { value: 'Sprinkler', emoji: '🌀', label: 'Sprinkler' },
  { value: 'Canal', emoji: '🏞️', label: 'Canal' },
  { value: 'Rain-fed', emoji: '🌧️', label: 'Rain-fed' },
  { value: 'Borewell', emoji: '🕳️', label: 'Borewell' },
];
const CROPS = [
  { value: 'Wheat', emoji: '🌾' }, { value: 'Rice', emoji: '🍚' },
  { value: 'Cotton', emoji: '🧶' }, { value: 'Sugarcane', emoji: '🎋' },
  { value: 'Soybean', emoji: '🟢' }, { value: 'Maize', emoji: '🌽' },
  { value: 'Tomato', emoji: '🍅' }, { value: 'Onion', emoji: '🧅' },
  { value: 'Potato', emoji: '🥔' }, { value: 'Chilli', emoji: '🌶️' },
  { value: 'Groundnut', emoji: '🥜' }, { value: 'Turmeric', emoji: '🟡' },
  { value: 'Banana', emoji: '🍌' }, { value: 'Mango', emoji: '🥭' },
  { value: 'Jowar', emoji: '🌿' },
];
const LANGUAGES = [
  { value: 'hi', flag: '🇮🇳', label: 'हिन्दी' },
  { value: 'mr', flag: '🇮🇳', label: 'मराठी' },
  { value: 'te', flag: '🇮🇳', label: 'తెలుగు' },
  { value: 'kn', flag: '🇮🇳', label: 'ಕನ್ನಡ' },
  { value: 'ta', flag: '🇮🇳', label: 'தமிழ்' },
  { value: 'en', flag: '🇬🇧', label: 'English' },
];

const STEPS = [
  '👤 Who are you?',
  '🌍 Your Location',
  '🌱 Your Land',
  '🌾 Your Crops',
  '🗣️ Language',
];

export default function ProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lang, setLang] = useState('en');

  const [form, setForm] = useState({
    name: '', phone: '', village: '', district: '', state: '',
    land_acres: '1', soil_type: '', irrigation: '',
    primary_crops: [] as string[], economic_class: '',
    preferred_lang: 'en',
  });

  // Load existing profile
  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.profile) {
        const p = d.profile;
        setForm({
          name: p.name ?? '',
          phone: p.phone ?? '',
          village: p.village ?? '',
          district: p.district ?? '',
          state: p.state ?? '',
          land_acres: p.land_acres?.toString() ?? '1',
          soil_type: p.soil_type ?? '',
          irrigation: p.irrigation ?? '',
          primary_crops: (() => { try { return JSON.parse(p.primary_crops ?? '[]'); } catch { return []; } })(),
          economic_class: p.economic_class ?? '',
          preferred_lang: p.preferred_lang ?? 'en',
        });
        setLang(p.preferred_lang ?? 'en');
      }
    }).catch(() => {});
  }, []);

  function set(field: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  function toggleCrop(crop: string) {
    setForm(f => ({
      ...f,
      primary_crops: f.primary_crops.includes(crop)
        ? f.primary_crops.filter(c => c !== crop)
        : f.primary_crops.length < 5 ? [...f.primary_crops, crop] : f.primary_crops,
    }));
  }

  async function saveStep() {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (step < STEPS.length - 1) {
        setStep(s => s + 1);
        speak('Great! Moving to next step.', getLangCode(lang));
      } else {
        setSaved(true);
        speak('Profile saved! Taking you to your dashboard.', getLangCode(lang));
        setTimeout(() => router.push('/'), 1800);
      }
    } finally {
      setSaving(false);
    }
  }

  const pct = Math.round(((step) / STEPS.length) * 100);

  return (
    <div className="page-container" style={{ maxWidth: 520 }}>
      {/* Header */}
      <div className="page-header">
        <h1>🌱 Farmer Profile</h1>
        <p>Tell us about yourself so AI can give you the best advice</p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          <span>Step {step + 1} of {STEPS.length} — {STEPS[step]}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#16a34a,#4ade80)', borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.6rem' }}>
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i < step && setStep(i)}
              style={{ flex: 1, height: 4, borderRadius: 999, border: 'none', cursor: i < step ? 'pointer' : 'default',
                background: i < step ? 'var(--green-500)' : i === step ? 'var(--green-600)' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      <div className="card fade-in" key={step}>
        {/* STEP 0 — Identity */}
        {step === 0 && (
          <div>
            <FieldRow label="Your Name" emoji="👤">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ramesh Kumar" />
                <VoiceMicButton onResult={t => set('name', t)} lang={getLangCode(lang)} />
              </div>
            </FieldRow>
            <FieldRow label="Mobile Number" emoji="📱">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit mobile number" type="tel" />
                <VoiceMicButton onResult={t => set('phone', t)} lang={getLangCode(lang)} />
              </div>
            </FieldRow>
          </div>
        )}

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div>
            {(['village', 'district', 'state'] as const).map(field => (
              <FieldRow key={field} label={field.charAt(0).toUpperCase() + field.slice(1)} emoji={field === 'village' ? '🏘️' : field === 'district' ? '🗺️' : '🌐'}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-control" value={form[field]} onChange={e => set(field, e.target.value)} placeholder={`Your ${field}`} />
                  <VoiceMicButton onResult={t => set(field, t)} lang={getLangCode(lang)} />
                </div>
              </FieldRow>
            ))}
          </div>
        )}

        {/* STEP 2 — Land */}
        {step === 2 && (
          <div>
            <FieldRow label="Land Size (Acres)" emoji="📐">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="range" min="0.5" max="50" step="0.5" value={form.land_acres}
                  onChange={e => set('land_acres', e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--green-500)' }} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--green-400)', minWidth: 50 }}>{form.land_acres} ac</span>
              </div>
            </FieldRow>

            <FieldRow label="Soil Type" emoji="🌍">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {SOIL_TYPES.map(s => (
                  <button key={s.value} className={`icon-card ${form.soil_type === s.value ? 'selected' : ''}`} onClick={() => set('soil_type', s.value)}>
                    <span className="icon-emoji">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </FieldRow>

            <FieldRow label="Irrigation Method" emoji="💧">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {IRRIGATION.map(ir => (
                  <button key={ir.value} className={`icon-card ${form.irrigation === ir.value ? 'selected' : ''}`} onClick={() => set('irrigation', ir.value)}>
                    <span className="icon-emoji">{ir.emoji}</span>
                    <span>{ir.label}</span>
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>
        )}

        {/* STEP 3 — Crops */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Tap up to 5 crops you grow or want to grow:
            </p>
            {form.primary_crops.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                {form.primary_crops.map(c => (
                  <span key={c} style={{ background: 'rgba(22,163,74,0.2)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 999, padding: '0.2rem 0.65rem', fontSize: '0.82rem', color: '#86efac' }}>
                    {CROPS.find(cr => cr.value === c)?.emoji} {c}
                    <button onClick={() => toggleCrop(c)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', marginLeft: 4, padding: 0, fontSize: '0.75rem' }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
              {CROPS.map(c => (
                <button key={c.value} className={`icon-card ${form.primary_crops.includes(c.value) ? 'selected' : ''}`}
                  onClick={() => toggleCrop(c.value)}
                  style={{ padding: '0.7rem 0.3rem', minHeight: 70 }}>
                  <span style={{ fontSize: '1.6rem' }}>{c.emoji}</span>
                  <span style={{ fontSize: '0.68rem' }}>{c.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 — Language */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Choose your preferred language for voice assistant:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
              {LANGUAGES.map(l => (
                <button key={l.value}
                  className={`icon-card ${form.preferred_lang === l.value ? 'selected' : ''}`}
                  onClick={() => { set('preferred_lang', l.value); setLang(l.value); }}
                  style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: '0.75rem', padding: '0.9rem 1rem', minHeight: 56 }}>
                  <span style={{ fontSize: '1.6rem' }}>{l.flag}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1, minHeight: 52 }}>
              ← Back
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={saveStep}
            disabled={saving}
            style={{ flex: 2, minHeight: 52, fontSize: '1rem' }}
          >
            {saving ? <span className="spinner" /> : step < STEPS.length - 1 ? 'Next →' : saved ? '✅ Saved!' : '💾 Save Profile'}
          </button>
        </div>
      </div>

      {/* Skip option */}
      {step === 0 && (
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
            Skip for now
          </button>
        </p>
      )}
    </div>
  );
}

function FieldRow({ label, emoji, children }: { label: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>{emoji}</span> {label}
      </label>
      {children}
    </div>
  );
}
