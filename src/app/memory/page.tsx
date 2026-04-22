'use client';
// src/app/memory/page.tsx — AI Memory timeline

import { useEffect, useState } from 'react';
import { speak, getLangCode } from '@/lib/voice';
import { getAgentIcon } from '@/lib/agents/memory';

interface MemoryEntry {
  id: number;
  agent: string;
  action_type: string;
  input_text: string;
  output_text: string;
  tools_used: string[];
  created_at: string;
}

const AGENT_LABELS: Record<string, string> = {
  recommendation: 'Crop AI', disease: 'Disease Agent',
  plan: 'Plan Agent', weather: 'Weather Agent',
  nutrient: 'Nutrient Agent', spatial: 'Spatial Agent',
  report: 'Report Agent', chat: 'AI Chat', 'agent-chat': 'AI Chat',
  replanner: 'Replanner',
};

function groupByDate(entries: MemoryEntry[]) {
  const groups: Record<string, MemoryEntry[]> = {};
  for (const e of entries) {
    const date = new Date(e.created_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(e);
  }
  return groups;
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const AGENTS = ['all', 'chat', 'recommendation', 'disease', 'plan', 'weather', 'nutrient', 'spatial', 'report'];

  useEffect(() => {
    loadMemory();
  }, [filter]);

  async function loadMemory() {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/memory' : `/api/memory?agent=${filter}`;
      const r = await fetch(url);
      const d = await r.json();
      setEntries(d.entries ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    await fetch('/api/memory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  }

  function handleSpeak(entry: MemoryEntry) {
    speak(`${AGENT_LABELS[entry.agent] ?? entry.agent} said: ${entry.output_text}`, getLangCode('en'));
  }

  const grouped = groupByDate(entries);

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1>🧠 AI Memory</h1>
          <span className="ai-badge">LIVE</span>
        </div>
        <p>Everything your AI agents have done for your farm</p>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {AGENTS.map(a => (
          <button key={a} onClick={() => setFilter(a)}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: 999,
              border: `1px solid ${filter === a ? 'var(--green-500)' : 'var(--glass-border)'}`,
              background: filter === a ? 'rgba(22,163,74,0.15)' : 'transparent',
              color: filter === a ? 'var(--green-400)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.15s',
            }}>
            {a === 'all' ? '📋 All' : `${getAgentIcon(a)} ${AGENT_LABELS[a] ?? a}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <p style={{ marginTop: '1rem' }}>Loading AI memory…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
          <h3 style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No AI actions recorded yet</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>
            Start using the AI chat or run recommendations to see memory here
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayEntries]) => (
          <div key={date} style={{ marginBottom: '1.5rem' }}>
            {/* Date label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{date}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            {dayEntries.map(entry => (
              <div key={entry.id} className="memory-entry fade-in">
                <div className="card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                  {/* Agent header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{getAgentIcon(entry.agent)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--green-400)' }}>
                        {AGENT_LABELS[entry.agent] ?? entry.agent}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {entry.action_type && ` · ${entry.action_type}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => handleSpeak(entry)} title="Hear this"
                        style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#4ade80', fontSize: '0.8rem' }}>
                        🔊
                      </button>
                      <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id} title="Delete"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.3rem 0.5rem', cursor: 'pointer', color: '#f87171', fontSize: '0.8rem' }}>
                        {deletingId === entry.id ? '⟳' : '🗑️'}
                      </button>
                    </div>
                  </div>

                  {/* Input */}
                  {entry.input_text && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                      &ldquo;{entry.input_text.slice(0, 100)}{entry.input_text.length > 100 ? '…' : ''}&rdquo;
                    </div>
                  )}

                  {/* Output */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    {entry.output_text.slice(0, 200)}{entry.output_text.length > 200 ? '…' : ''}
                  </div>

                  {/* Tools used */}
                  {entry.tools_used?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
                      {entry.tools_used.map(t => (
                        <span key={t} style={{ fontSize: '0.65rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 999, padding: '0.15rem 0.45rem', color: '#c4b5fd' }}>
                          🔧 {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {entries.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', marginTop: '1rem' }}>
          Showing {entries.length} AI actions · Auto-pruned after 100 entries
        </p>
      )}
    </div>
  );
}
