// src/components/Dashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardData } from '@/lib/agents/types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="card fade-in" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-2)' }}>
      <div className="spinner" style={{ width: 40, height: 40, marginBottom: '1rem' }} />
      <p style={{ color: 'var(--text-muted)' }}>Syncing with AI Farm Intelligence...</p>
    </div>
  );

  if (error || !data) return null; // Fallback to feature grid handled in page.tsx

  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Main Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 240, background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.1), rgba(15, 26, 18, 0.7))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
             <span style={{ fontSize: '1.5rem' }}>🤖</span>
             <span style={{ color: 'var(--green-400)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em' }}>AI PULSE</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>{data.greeting}</h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '2rem' }}>{data.ai_pulse}</p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/agent-chat" className="btn btn-primary">
              💬 Chat with AI Agent
            </Link>
            <Link href="/report" className="btn btn-secondary">
              📊 Full Farm Report
            </Link>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Active Plan */}
        <div className="card">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green-400)', marginBottom: '1rem' }}>ACTIVE CROP PLAN</div>
          {data.active_plan ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🌾</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{data.active_plan.crop}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Growing phase</div>
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '1rem' }}>Next: {data.active_plan.next_task}</p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${data.active_plan.progress}%`, background: 'var(--green-500)' }} />
              </div>
            </>
          ) : (
            <Link href="/recommendation" style={{ color: 'var(--green-400)' }}>+ Start a new crop plan</Link>
          )}
        </div>

      </div>
    </div>
  );
}
