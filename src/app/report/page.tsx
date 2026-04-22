'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReportPage() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/report')
      .then((r) => r.json())
      .then((d) => { setReport(d.report || ''); setLoading(false); })
      .catch(() => { setError('Failed to generate report'); setLoading(false); });
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>📄 Final Advisory Report</h1>
        <p>The Report Agent has consolidated your session into a final structured advisory.</p>
      </div>
      <div className="card fade-in">
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
            <p style={{ marginTop: '1rem' }}>Generating your advisory...</p>
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        {report && (
          <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '0.92rem', background: 'rgba(15,26,18,0.6)', padding: '1.5rem', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
            {report}
          </pre>
        )}
      </div>

      {report && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <Link href="/" className="btn btn-secondary">🏠 Start New Session</Link>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
