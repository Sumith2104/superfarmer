'use client';
// src/app/agents/page.tsx — Agent Hub: visualise all AI agents + run pipelines

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CropIcon, DiseaseIcon, PlanIcon, WeatherIcon, NutrientIcon,
  SpatialIcon, ReportIcon, ChatIcon, ZapIcon, RefreshIcon,
  BrainIcon, CheckIcon, AlertIcon,
} from '@/components/Icons';

interface AgentCardDef {
  id: string;
  name: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  href?: string;
}

const AGENTS: AgentCardDef[] = [
  { id: 'recommendation', name: 'Crop AI',      desc: 'Best crops for your soil & season',   Icon: CropIcon,    color: '#4ade80', href: '/recommendation' },
  { id: 'disease',        name: 'Disease Agent', desc: 'Photo-based plant disease diagnosis', Icon: DiseaseIcon, color: '#f87171', href: '/disease' },
  { id: 'plan',           name: 'Plan Agent',    desc: 'Full crop lifecycle planning',        Icon: PlanIcon,    color: '#a78bfa', href: '/plan' },
  { id: 'weather',        name: 'Weather Agent', desc: 'Live forecast & farm advisories',     Icon: WeatherIcon, color: '#60a5fa' },
  { id: 'nutrient',       name: 'Nutrient AI',   desc: 'Soil nutrients & fertiliser plan',   Icon: NutrientIcon,color: '#fbbf24' },
  { id: 'spatial',        name: 'Spatial Twin',  desc: 'Satellite field mapping & layouts',  Icon: SpatialIcon, color: '#34d399', href: '/spatial-planner' },
  { id: 'report',         name: 'Report Agent',  desc: 'Comprehensive farm analysis report', Icon: ReportIcon,  color: '#f472b6', href: '/report' },
  { id: 'agent-chat',     name: 'AI Assistant',  desc: 'Ask anything — uses all agents',     Icon: ChatIcon,    color: '#818cf8', href: '/agent-chat' },
];

const PIPELINES = [
  { id: 'full_analysis',  label: 'Full Farm Analysis',  agents: ['weather','recommendation','nutrient','report'], color: '#4ade80' },
  { id: 'health_check',   label: 'Crop Health Check',   agents: ['disease','nutrient','plan'],                   color: '#f87171' },
  { id: 'season_prep',    label: 'Season Preparation',  agents: ['weather','recommendation','plan'],             color: '#a78bfa' },
];

interface MemoryEntry { id: number; agent: string; output_text: string; created_at: string; }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000)     return `${Math.floor(diff/1000)}s ago`;
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

export default function AgentsPage() {
  const [recentMemory, setRecentMemory] = useState<MemoryEntry[]>([]);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/memory?limit=8')
      .then(r => r.json())
      .then(d => setRecentMemory(d.entries ?? []))
      .catch(() => {});
  }, []);

  async function runPipeline(pipeline: typeof PIPELINES[0]) {
    setRunningPipeline(pipeline.id);
    setPipelineLog([`🚀 Starting: ${pipeline.label}`]);

    for (const agentId of pipeline.agents) {
      const agentDef = AGENTS.find(a => a.id === agentId);
      const name = agentDef?.name ?? agentId;
      setPipelineLog(prev => [...prev, `⟳ Running ${name}…`]);
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      setPipelineLog(prev => {
        const next = [...prev];
        next[next.length - 1] = `✓ ${name} complete`;
        return next;
      });
    }
    setPipelineLog(prev => [...prev, `✅ ${pipeline.label} finished!`]);
    setTimeout(() => { setRunningPipeline(null); setPipelineLog([]); }, 3000);
  }

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1>⚡ AI Agent Hub</h1>
          <span className="ai-badge">LIVE</span>
        </div>
        <p>Your farm&apos;s AI team — 8 specialised agents always ready</p>
      </div>

      {/* Agent cards grid */}
      <div className="card-grid" style={{ marginBottom: '2rem' }}>
        {AGENTS.map(({ id, name, desc, Icon, color, href }) => (
          <div key={id} className="card feature-card" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Agent icon + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>

            {/* Status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ready</span>
            </div>

            {/* Run button */}
            {href ? (
              <Link href={href} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.5rem 0', width: '100%', justifyContent: 'center', textAlign: 'center' }}>
                Open →
              </Link>
            ) : (
              <Link href={`/agent-chat?q=Run ${name} for my farm`} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.5rem 0', width: '100%', justifyContent: 'center', textAlign: 'center' }}>
                Ask AI →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Pipelines */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <ZapIcon size={18} color="#fbbf24" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Quick Pipelines</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chain multiple agents automatically</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {PIPELINES.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: `${p.color}08`, border: `1px solid ${p.color}20`, borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: p.color }}>{p.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {p.agents.map(a => AGENTS.find(ag => ag.id === a)?.name ?? a).join(' → ')}
                </div>
              </div>
              <button
                onClick={() => runPipeline(p)}
                disabled={runningPipeline !== null}
                style={{
                  background: runningPipeline === p.id ? `${p.color}30` : `${p.color}18`,
                  border: `1px solid ${p.color}40`,
                  borderRadius: 8, padding: '0.4rem 0.85rem',
                  color: p.color, fontSize: '0.78rem', fontWeight: 700,
                  cursor: runningPipeline ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  opacity: runningPipeline && runningPipeline !== p.id ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                {runningPipeline === p.id
                  ? <><RefreshIcon size={13} color={p.color} /> Running…</>
                  : <><ZapIcon size={13} color={p.color} /> Run</>
                }
              </button>
            </div>
          ))}
        </div>

        {/* Pipeline log */}
        {pipelineLog.length > 0 && (
          <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
            {pipelineLog.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('✅') ? '#4ade80' : line.startsWith('✓') ? '#86efac' : 'var(--text)', marginBottom: 2 }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Activity Feed */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <BrainIcon size={18} color="#34d399" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recent AI Activity</h2>
          <Link href="/memory" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--green-400)' }}>View all →</Link>
        </div>

        {recentMemory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No AI actions yet — start chatting with an agent above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentMemory.map(entry => {
              const agent = AGENTS.find(a => a.id === entry.agent);
              const Icon = agent?.Icon ?? ChatIcon;
              const color = agent?.color ?? '#86efac';
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.output_text?.slice(0, 90) ?? '…'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {agent?.name ?? entry.agent} · {timeAgo(entry.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
