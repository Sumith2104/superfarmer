'use client';
// src/components/BottomNav.tsx — Mobile-only bottom navigation

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Inline SVG icons — guaranteed to render correctly at small sizes
function HomeIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}
function CropIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M5.2 13C4.4 12 4 10.9 4 9.5a8 8 0 0116 0c0 1.4-.4 2.5-1.2 3.5L12 22z" />
    </svg>
  );
}
function ChatIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
function MapIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function DiseaseIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="11" />
      <line x1="11" y1="14" x2="11.01" y2="14" />
    </svg>
  );
}
function ProfileIco({ active }: { active: boolean }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogoutIco() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/',                label: 'Home',    Ico: HomeIco },
  { href: '/agent-chat',      label: 'AI',      Ico: ChatIco },
  { href: '/spatial-planner', label: 'Map',     Ico: MapIco },
  { href: '/disease',         label: 'Disease', Ico: DiseaseIco },
  { href: '/profile',         label: 'Profile', Ico: ProfileIco },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setLoggedIn(false);
    setShowLogout(false);
    router.push('/');
    router.refresh();
  }

  if (!loggedIn) return null;

  return (
    <>
      {/* ── Logout bottom sheet ── */}
      {showLogout && (
        <div onClick={() => setShowLogout(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#0a1a0f',
            border: '1px solid rgba(74,222,128,0.15)',
            borderRadius: '20px 20px 0 0',
            padding: '1.25rem 1.5rem calc(var(--bottom-nav-h) + 1.5rem)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '0 auto 1.25rem' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>Log out?</p>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem' }}>You will need to login again</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setShowLogout(false)} style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '0.85rem', borderRadius: 12, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom nav bar ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ href, label, Ico }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => { if ('vibrate' in navigator) navigator.vibrate(8); }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, paddingTop: 6, textDecoration: 'none',
                color: active ? '#4ade80' : 'rgba(255,255,255,0.4)',
                fontSize: '0.58rem', fontWeight: active ? 700 : 500,
                letterSpacing: '0.03em', position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', top: 0, left: '18%', right: '18%',
                  height: 2, borderRadius: '0 0 4px 4px',
                  background: 'linear-gradient(90deg,#4ade80,#16a34a)',
                }} />
              )}
              <span style={{
                transform: active ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.15s',
                filter: active ? 'drop-shadow(0 0 5px rgba(74,222,128,0.5))' : 'none',
              }}>
                <Ico active={active} />
              </span>
              <span style={{ color: active ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>{label}</span>
            </Link>
          );
        })}

        {/* Logout */}
        <button onClick={() => setShowLogout(true)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 3, paddingTop: 6, background: 'none', border: 'none',
          color: 'rgba(239,68,68,0.65)', fontSize: '0.58rem', fontWeight: 500,
          letterSpacing: '0.03em', cursor: 'pointer',
        }}>
          <LogoutIco />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}
