'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './Navbar.module.css';

const navLinks = [
  { href: '/recommendation', label: '🌾 Crops' },
  { href: '/plan', label: '📋 Plan' },
  { href: '/disease', label: '🔬 Disease' },
  { href: '/spatial-planner', label: '🗺️ Spatial' },
  { href: '/report', label: '📄 Report' },
  { href: '/agent-chat', label: '🤖 AI Chat' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Fetch session status on mount and on every route change
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setLoggedIn(d.loggedIn))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/login', { method: 'DELETE' });
    setLoggedIn(false);
    router.push('/');
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>🌱 SuperFarmer</Link>

        {loggedIn && (
          <div className={styles.links}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.link} ${pathname === l.href ? styles.active : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          {loggedIn ? (
            <button className="btn btn-secondary" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Logging out...' : 'Logout'}
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
