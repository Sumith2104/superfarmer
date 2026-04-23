'use client';
// src/components/BottomNav.tsx — Mobile bottom nav + full-page "More" drawer

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ── Inline SVGs ────────────────────────────────────────────────
function Ico({ d, active, size = 22 }: { d: string; active?: boolean; size?: number }) {
  const c = active ? '#4ade80' : 'rgba(255,255,255,0.45)';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Primary nav (always visible) ───────────────────────────────
const PRIMARY = [
  { href: '/',            label: 'Home',    d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
  { href: '/agent-chat',  label: 'AI Chat', d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { href: '/disease',     label: 'Disease', d: 'M12 2a10 10 0 100 20 10 10 0 000-20z M12 8v4 M12 16h.01' },
  { href: '/spatial-planner', label: 'Map', d: 'M3 6l9-4 9 4v12l-9 4-9-4V6z M12 2v20 M3 6l9 4 9-4' },
];

// ── All pages in the "More" drawer ────────────────────────────
const MORE_PAGES = [
  { href: '/profile',         label: 'My Profile',       emoji: '👤', desc: 'View & edit your farm info' },
  { href: '/recommendation',  label: 'Crop Advice',       emoji: '🌱', desc: 'AI crop recommendations' },
  { href: '/plan',            label: 'Crop Plan',         emoji: '📅', desc: 'Season management plan' },
  { href: '/disease',         label: 'Disease Diagnosis', emoji: '🔬', desc: 'AI pest & disease scanner' },
  { href: '/spatial-planner', label: 'Spatial Map',       emoji: '🗺️', desc: 'Draw & measure your field' },
  { href: '/agent-chat',      label: 'AI Chat',           emoji: '💬', desc: 'Chat with farm AI agents' },
  { href: '/agents',          label: 'Agent Hub',         emoji: '🤖', desc: 'Run autonomous AI agents' },
  { href: '/report',          label: 'Farm Report',       emoji: '📊', desc: 'Full AI farm analysis' },
  { href: '/memory',          label: 'AI Memory',         emoji: '🧠', desc: 'Agent knowledge base' },
  { href: '/files',           label: 'File Manager',      emoji: '🗄️', desc: 'Upload & manage farm files' },
  { href: '/intake',          label: 'Farm Setup',        emoji: '🏡', desc: 'Update farm basics' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  // Close drawer on route change
  useEffect(() => { setShowMore(false); }, [pathname]);

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setLoggedIn(false);
    setShowMore(false);
    setShowLogout(false);
    router.push('/');
    router.refresh();
  }

  if (!loggedIn) return null;

  return (
    <>
      {/* ── More Drawer (full-height slide-up) ── */}
      {showMore && (
        <div
          onClick={() => setShowMore(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              maxHeight: '85vh',
              background: 'linear-gradient(180deg, #0d1f12 0%, #0a1a0e 100%)',
              border: '1px solid rgba(74,222,128,0.18)',
              borderRadius: '24px 24px 0 0',
              display: 'flex', flexDirection: 'column',
              animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            {/* Handle bar */}
            <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
              <div style={{
                width: 40, height: 4, borderRadius: 999,
                background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(74,222,128,0.7)', letterSpacing: '0.12em' }}>
                  ALL PAGES
                </span>
                <button
                  onClick={() => setShowMore(false)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.55)',
                    cursor: 'pointer', fontSize: '0.78rem',
                  }}
                >✕ Close</button>
              </div>
            </div>

            {/* Scrollable page list */}
            <div style={{ overflowY: 'auto', padding: '0 14px', paddingBottom: 'calc(var(--bottom-nav-h) + 8px)', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {MORE_PAGES.map(({ href, label, emoji, desc }) => {
                  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.85rem 0.9rem',
                        background: active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${active ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 14, textDecoration: 'none', transition: 'all 0.15s',
                      }}
                      onTouchStart={e => {
                        (e.currentTarget as HTMLElement).style.background = active ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.07)';
                      }}
                      onTouchEnd={e => {
                        (e.currentTarget as HTMLElement).style.background = active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)';
                      }}
                    >
                      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? '#4ade80' : '#e5e7eb', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Logout row at bottom of drawer */}
              <button
                onClick={() => { setShowMore(false); setShowLogout(true); }}
                style={{
                  width: '100%', marginTop: '0.75rem', padding: '0.85rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>🚪</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>Logout</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(239,68,68,0.5)' }}>Sign out of your account</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout confirm sheet ── */}
      {showLogout && (
        <div onClick={() => setShowLogout(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500,
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
        {PRIMARY.map(({ href, label, d }) => {
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
                <Ico d={d} active={active} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        {/* ── More / Burger button ── */}
        <button
          onClick={() => { setShowMore(true); if ('vibrate' in navigator) navigator.vibrate(8); }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, paddingTop: 6, background: 'none', border: 'none',
            color: showMore ? '#4ade80' : 'rgba(255,255,255,0.4)',
            fontSize: '0.58rem', fontWeight: showMore ? 700 : 500,
            letterSpacing: '0.03em', cursor: 'pointer', position: 'relative',
          }}
        >
          {showMore && (
            <span style={{
              position: 'absolute', top: 0, left: '18%', right: '18%',
              height: 2, borderRadius: '0 0 4px 4px',
              background: 'linear-gradient(90deg,#4ade80,#16a34a)',
            }} />
          )}
          <span style={{
            transform: showMore ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 0.15s',
            filter: showMore ? 'drop-shadow(0 0 5px rgba(74,222,128,0.5))' : 'none',
          }}>
            {/* Hamburger / X icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={showMore ? '#4ade80' : 'rgba(255,255,255,0.45)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showMore
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>
              }
            </svg>
          </span>
          <span>More</span>
        </button>
      </nav>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
