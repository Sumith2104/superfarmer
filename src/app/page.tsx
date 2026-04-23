// src/app/page.tsx — Home / Dashboard
import Link from 'next/link';
import { getSession } from '@/lib/session';
import Dashboard from '@/components/Dashboard';
import {
  CropIcon, DiseaseIcon, SpatialIcon, PlanIcon, ChatIcon,
  FileIcon, BrainIcon, ZapIcon, LeafIcon, MoneyIcon,
} from '@/components/Icons';

const features = [
  { Icon: CropIcon,    color: '#4ade80', title: 'AI Crop Recommendations', desc: 'Get AI crop suggestions tailored to your soil, water, and season.', href: '/recommendation' },
  { Icon: DiseaseIcon, color: '#f87171', title: 'Disease Diagnosis',        desc: 'Upload a leaf photo for instant AI-powered plant disease analysis.', href: '/disease' },
  { Icon: SpatialIcon, color: '#60a5fa', title: 'Spatial Twin',             desc: 'Draw your real field on satellite, then simulate digital twin layouts.', href: '/spatial-planner' },
  { Icon: PlanIcon,    color: '#a78bfa', title: 'Crop Planning',            desc: 'Complete lifecycle plans: sowing, irrigation, fertilizer, and harvest.', href: '/plan' },
  { Icon: ChatIcon,    color: '#34d399', title: 'Agentic AI Chat',          desc: 'Farming assistant that uses 8+ tools to answer any question.', href: '/agent-chat' },
  { Icon: FileIcon,    color: '#fbbf24', title: 'File Manager',             desc: 'Upload, manage, and download files stored in FluxBase cloud.', href: '/files' },
];

export default async function Home() {
  const session = await getSession();
  const loggedIn = !!session.userId;
  const hasProfile = !!session.farmerId;

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '3rem 0 2rem', animation: 'fadeIn 0.6s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <LeafIcon size={56} color="#4ade80" style={{ filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.5))' }} />
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3.2rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem' }}>
          Farm Smarter with{' '}
          <span style={{ background: 'linear-gradient(135deg,#22c55e,#a3e635)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Intelligence
          </span>
        </h1>
        <p style={{ fontSize: 'clamp(0.9rem,3vw,1.1rem)', color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto 2rem' }}>
          Voice-first AI platform for every Indian farmer — speak your questions, get instant answers.
        </p>
        {!loggedIn && (
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>Get Started Free</Link>
            <Link href="/login"  className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>Login</Link>
          </div>
        )}
      </div>

      {/* ── Mandi Price Ticker ── */}
      <div style={{ marginBottom: '2.5rem', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: '0.6rem 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, fontSize: '0.65rem', padding: '0.3rem 0.75rem', borderRadius: '8px 0 0 8px', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MoneyIcon size={12} color="#fff" /> MANDI
          </div>
          <div className="ticker-wrap" style={{ flex: 1 }}>
            <div className="ticker-inner">
              {[
                { name: 'Wheat',    price: '₹2,275/q', change: '+1.2%', up: true },
                { name: 'Rice',     price: '₹3,900/q', change: '+0.8%', up: true },
                { name: 'Tomato',   price: '₹1,450/q', change: '-3.5%', up: false },
                { name: 'Onion',    price: '₹980/q',   change: '+2.1%', up: true },
                { name: 'Soybean',  price: '₹4,200/q', change: '+0.5%', up: true },
                { name: 'Maize',    price: '₹1,820/q', change: '-1.0%', up: false },
                { name: 'Cotton',   price: '₹6,500/q', change: '+1.8%', up: true },
                { name: 'Groundnut',price: '₹5,150/q', change: '+0.3%', up: true },
                { name: 'Mustard',  price: '₹5,450/q', change: '-0.7%', up: false },
                { name: 'Sugarcane',price: '₹315/q',   change: '0.0%',  up: true },
                // Duplicate for seamless loop
                { name: 'Wheat',    price: '₹2,275/q', change: '+1.2%', up: true },
                { name: 'Rice',     price: '₹3,900/q', change: '+0.8%', up: true },
                { name: 'Tomato',   price: '₹1,450/q', change: '-3.5%', up: false },
                { name: 'Onion',    price: '₹980/q',   change: '+2.1%', up: true },
                { name: 'Soybean',  price: '₹4,200/q', change: '+0.5%', up: true },
                { name: 'Maize',    price: '₹1,820/q', change: '-1.0%', up: false },
                { name: 'Cotton',   price: '₹6,500/q', change: '+1.8%', up: true },
                { name: 'Groundnut',price: '₹5,150/q', change: '+0.3%', up: true },
                { name: 'Mustard',  price: '₹5,450/q', change: '-0.7%', up: false },
                { name: 'Sugarcane',price: '₹315/q',   change: '0.0%',  up: true },
              ].map((item, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0 1rem', borderRight: '1px solid rgba(74,222,128,0.12)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.price}</span>
                  <span style={{ color: item.up ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '0.72rem' }}>
                    {item.up ? '▲' : '▼'} {item.change}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile completion banner ── */}
      {loggedIn && !hasProfile && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <LeafIcon size={20} color="#fde047" />
          <div style={{ flex: 1 }}>
            <strong>Complete your profile</strong> — AI needs your farm details to give personalized advice.
          </div>
          <Link href="/profile" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}>
            Set up →
          </Link>
        </div>
      )}

      {/* ── Main content ── */}
      {loggedIn && hasProfile ? (
        <section>
          <Dashboard />
          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              All Tools
            </h3>
            <div className="card-grid">
              {features.map((f, i) => (
                <Link key={f.href} href={f.href} style={{ textDecoration: 'none' }}>
                  <div className="card fade-in feature-card" style={{ padding: '1.25rem', animationDelay: `${i * 0.05}s`, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <f.Icon size={22} color={f.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text)' }}>{f.title}</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="card-grid">
          {features.map((f, i) => (
            <Link key={f.href} href={loggedIn ? f.href : '/signup'} style={{ textDecoration: 'none' }}>
              <div className="card fade-in feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                  <f.Icon size={26} color={f.color} />
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{f.desc}</p>
                {!loggedIn && (
                  <div style={{ marginTop: '1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--green-500)' }}>SIGN UP TO UNLOCK →</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Stats row (logged out) ── */}
      {!loggedIn && (
        <div className="card-grid" style={{ marginTop: '3rem', textAlign: 'center' }}>
          {[
            { Icon: ZapIcon,  val: '15+', label: 'AI Agents', color: '#a78bfa' },
            { Icon: BrainIcon, val: '∞',   label: 'Memory',    color: '#34d399' },
            { Icon: LeafIcon, val: '100%', label: 'Free',      color: '#4ade80' },
          ].map(({ Icon, val, label, color }) => (
            <div key={label} style={{ padding: '1.5rem 1rem' }}>
              <Icon size={28} color={color} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
