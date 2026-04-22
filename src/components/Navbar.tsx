'use client';
// src/components/Navbar.tsx

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';
import {
  CropIcon, PlanIcon, DiseaseIcon, MapIcon,
  ChatIcon, BrainIcon, ZapIcon, ProfileIcon, LogoutIcon, LeafIcon,
} from './Icons';

const navLinks = [
  { href: '/recommendation',  Icon: CropIcon,    label: 'Crops' },
  { href: '/plan',            Icon: PlanIcon,    label: 'Plan' },
  { href: '/disease',         Icon: DiseaseIcon, label: 'Disease' },
  { href: '/spatial-planner', Icon: MapIcon,     label: 'Spatial' },
  { href: '/agent-chat',      Icon: ChatIcon,    label: 'AI Chat' },
  { href: '/memory',          Icon: BrainIcon,   label: 'Memory' },
  { href: '/agents',          Icon: ZapIcon,     label: 'Agents' },
  { href: '/profile',         Icon: ProfileIcon, label: 'Profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors — still clear local state
    }
    setLoggedIn(false);
    setLoggingOut(false);
    router.push('/');
    router.refresh(); // force server components to re-render
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <LeafIcon size={20} color="#4ade80" />
          <span>SuperFarmer</span>
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        {loggedIn && (
          <div className={styles.links}>
            {navLinks.map(({ href, Icon, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.link} ${active ? styles.active : ''}`}
                >
                  <Icon size={15} color={active ? '#4ade80' : '#86efac'} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Auth actions */}
        <div className={styles.actions}>
          {loggedIn ? (
            <button className="btn btn-secondary" onClick={handleLogout} disabled={loggingOut}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogoutIcon size={16} color="currentColor" />
              <span className={styles.logoutLabel}>{loggingOut ? 'Logging out…' : 'Logout'}</span>
            </button>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">Login</Link>
              <Link href="/signup" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
