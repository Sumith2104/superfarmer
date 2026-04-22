// src/app/page.tsx — Home
import Link from 'next/link';
import { getSession } from '@/lib/session';
import Dashboard from '@/components/Dashboard';

const features = [
  { icon: '🌾', title: 'AI Crop Recommendations', desc: 'Get Gemini-powered crop suggestions tailored to your soil, water, and season.', href: '/recommendation' },
  { icon: '🔬', title: 'Disease Diagnosis', desc: 'Upload a leaf photo for instant AI-powered plant pathology analysis.', href: '/disease' },
  { icon: '🛰️', title: 'Spatial Twin', desc: 'Draw your real field on satellite, then simulate 2D & 3D digital twin layouts.', href: '/spatial-planner' },
  { icon: '📋', title: 'Crop Planning', desc: 'Complete lifecycle plans: sowing, irrigation, fertilizer, and harvest timelines.', href: '/plan' },
  { icon: '🤖', title: 'Agentic AI Chat', desc: 'ReAct-powered farming assistant that autonomously uses 8+ tools to answer any question.', href: '/agent-chat' },
  { icon: '🗄️', title: 'File Manager', desc: 'Upload, manage, and download any file — stored securely in FluxBase S3 cloud storage.', href: '/files' },
];


export default async function Home() {
  const session = await getSession();
  const loggedIn = !!session.userId;
  const hasProfile = !!session.farmerId;

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '4rem 0 3rem', animation: 'fadeIn 0.6s ease' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem' }}>
          Farm Smarter with{' '}
          <span style={{ background: 'linear-gradient(135deg, #22c55e, #a3e635)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Intelligence
          </span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 2.5rem' }}>
          Superfarmer brings cutting-edge AI, real-time weather, and predictive analytics to every farmer — in one platform.
        </p>
        {!loggedIn && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
              Get Started Free
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
              Login
            </Link>
          </div>
        )}
      </div>

      {/* Live Mandi Price Ticker */}
      <div style={{ marginBottom: '3rem', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: '0.6rem 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', fontWeight: 700, fontSize: '0.7rem', padding: '0.3rem 0.85rem', borderRadius: '8px 0 0 8px', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📈 MANDI PRICES
          </div>
          <div className="ticker-wrap" style={{ flex: 1 }}>
            <div className="ticker-inner">
              {[
                { name: 'Wheat', price: '₹2,275/q', change: '+1.2%', up: true },
                { name: 'Rice (Basmati)', price: '₹3,900/q', change: '+0.8%', up: true },
                { name: 'Tomato', price: '₹1,450/q', change: '-3.5%', up: false },
                { name: 'Onion', price: '₹980/q', change: '+2.1%', up: true },
                { name: 'Soybean', price: '₹4,200/q', change: '+0.5%', up: true },
                { name: 'Maize', price: '₹1,820/q', change: '-1.0%', up: false },
                { name: 'Cotton', price: '₹6,500/q', change: '+1.8%', up: true },
                { name: 'Groundnut', price: '₹5,150/q', change: '+0.3%', up: true },
                { name: 'Mustard', price: '₹5,450/q', change: '-0.7%', up: false },
                { name: 'Sugarcane', price: '₹315/q', change: '0.0%', up: true },
                // Duplicate for seamless loop
                { name: 'Wheat', price: '₹2,275/q', change: '+1.2%', up: true },
                { name: 'Rice (Basmati)', price: '₹3,900/q', change: '+0.8%', up: true },
                { name: 'Tomato', price: '₹1,450/q', change: '-3.5%', up: false },
                { name: 'Onion', price: '₹980/q', change: '+2.1%', up: true },
                { name: 'Soybean', price: '₹4,200/q', change: '+0.5%', up: true },
                { name: 'Maize', price: '₹1,820/q', change: '-1.0%', up: false },
                { name: 'Cotton', price: '₹6,500/q', change: '+1.8%', up: true },
                { name: 'Groundnut', price: '₹5,150/q', change: '+0.3%', up: true },
                { name: 'Mustard', price: '₹5,450/q', change: '-0.7%', up: false },
                { name: 'Sugarcane', price: '₹315/q', change: '0.0%', up: true },
              ].map((item, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0 1rem', borderRight: '1px solid rgba(74,222,128,0.12)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.price}</span>
                  <span style={{ color: item.up ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '0.75rem' }}>
                    {item.up ? '▲' : '▼'} {item.change}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content: Dashboard or Feature Grid */}
      {loggedIn && hasProfile ? (
        <section style={{ marginBottom: '4rem' }}>
          <Dashboard />
          <div style={{ marginTop: '4rem', opacity: 0.7 }}>
             <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Explore More Tools</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {features.map((f, i) => (
                  <Link key={f.href} href={f.href} style={{ textDecoration: 'none' }}>
                    <div className="card fade-in feature-card" style={{ padding: '1.25rem', animationDelay: `${i * 0.05}s` }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon} {f.title}</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{f.desc}</p>
                    </div>
                  </Link>
                ))}
             </div>
          </div>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <Link key={f.href} href={loggedIn ? f.href : '/signup'} style={{ textDecoration: 'none' }}>
              <div
                className="card fade-in feature-card"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{f.desc}</p>
                 {!loggedIn && <div style={{ marginTop: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-500)' }}>SIGN UP TO UNLOCK →</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
