'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      // Returning user (has profile) → dashboard, new user → intake setup
      router.push(data.farmerId ? '/' : '/intake');
      router.refresh();
    } else setError(data.error || 'Login failed');
  }

  return (
    <div className="page-container" style={{ maxWidth: 440 }}>
      <div className="card fade-in" style={{ marginTop: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.5rem 0 0.3rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Login to your farming dashboard</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="farmer@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            {loading ? <><span className="spinner" /> Logging in...</> : 'Login →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          No account? <Link href="/signup">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
