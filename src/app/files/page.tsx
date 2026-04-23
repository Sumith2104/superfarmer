'use client';
import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────
interface UploadedFile {
  id: string;
  name: string;
  size?: number;
  type?: string;
  bucket?: string;
  uploadedAt?: string;
}

// ── Helpers ───────────────────────────────────────────────
const BUCKETS = ['superfarmer-files', 'superfarmer-fields', 'superfarmer-reports', 'superfarmer-images'];

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileIcon(name: string, type?: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext) || type?.startsWith('image/')) return '🖼️';
  if (['pdf'].includes(ext)) return '📄';
  if (['json','geojson'].includes(ext)) return '🗂️';
  if (['csv','xlsx','xls'].includes(ext)) return '📊';
  if (['mp4','mov','avi','webm'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg'].includes(ext)) return '🎵';
  if (['zip','tar','gz','rar'].includes(ext)) return '🗜️';
  if (['py','js','ts','tsx','html','css'].includes(ext)) return '💻';
  if (['txt','md'].includes(ext)) return '📝';
  if (['doc','docx'].includes(ext)) return '📃';
  return '📁';
}

function fileColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: '#ef4444', json: '#22d3ee', geojson: '#4ade80', csv: '#34d399',
    xlsx: '#22c55e', xls: '#22c55e', png: '#a78bfa', jpg: '#f97316',
    jpeg: '#f97316', webp: '#f97316', mp4: '#fb923c', py: '#fbbf24',
    js: '#f59e0b', ts: '#38bdf8', tsx: '#38bdf8', md: '#94a3b8',
  };
  return map[ext] || '#6366f1';
}

// ─────────────────────────────────────────────────────────────
export default function FileManagerPage() {
  const [bucket, setBucket] = useState(BUCKETS[0]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    setLoadingFiles(true);
    setError('');
    try {
      const res = await fetch(`/api/storage/list?bucket=${bucket}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setFiles([]); }
      else setFiles(data.files || []);
    } catch { setError('Failed to load files.'); }
    finally { setLoadingFiles(false); }
  }

  useEffect(() => { loadFiles(); }, [bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true); setError(''); setSuccess('');
    let done = 0;
    for (const file of arr) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', bucket);
        const res = await fetch('/api/storage/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { setError(`❌ ${data.error || 'Upload failed'}`); break; }
        done++;
        setUploadProgress(Math.round((done / arr.length) * 100));
      } catch { setError('Upload error. Check console.'); break; }
    }
    if (done === arr.length) setSuccess(`✅ ${done} file${done > 1 ? 's' : ''} uploaded to ${bucket}`);
    setUploading(false);
    setUploadProgress(0);
    await loadFiles();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = '';
  }

  function downloadFile(file: UploadedFile) {
    window.open(`/api/storage/download/${file.id}?name=${encodeURIComponent(file.name)}`, '_blank');
  }

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0 }}>🗄️ File Manager</h1>
          <span style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: 999, letterSpacing: '0.08em' }}>FLUXBASE S3</span>
        </div>
        <p>Upload, manage, and download any file — stored securely in FluxBase S3 cloud storage.</p>
      </div>

      {/* Bucket selector + stats */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>BUCKET</label>
          <select className="form-control" value={bucket} onChange={(e) => setBucket(e.target.value)}>
            {BUCKETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
          {[
            { label: 'Files', value: files.length },
            { label: 'Total Size', value: formatBytes(totalSize) },
            { label: 'Bucket', value: bucket.replace('superfarmer-', '') },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4ade80' }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={loadFiles} disabled={loadingFiles} style={{ height: 38 }}>
          {loadingFiles ? <><span className="spinner" /> Loading...</> : '🔄 Refresh'}
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#4ade80' : 'rgba(99,102,241,0.4)'}`,
          borderRadius: 14, padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? 'rgba(74,222,128,0.06)' : 'rgba(99,102,241,0.04)',
          transition: 'all 0.2s', marginBottom: '1rem',
          boxShadow: dragOver ? '0 0 30px rgba(74,222,128,0.12)' : 'none',
        }}
      >
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={onFileInput} />
        <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>{uploading ? '⏳' : dragOver ? '📂' : '☁️'}</div>
        {uploading ? (
          <div>
            <p style={{ fontWeight: 700, color: '#4ade80', marginBottom: '0.75rem' }}>Uploading... {uploadProgress}%</p>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, maxWidth: 300, margin: '0 auto' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#4ade80,#22d3ee)', borderRadius: 999, transition: 'width 0.3s' }} />
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: dragOver ? '#4ade80' : 'var(--text-muted)', margin: '0 0 0.25rem' }}>
              {dragOver ? 'Drop to upload' : 'Drag & drop files here'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              or <span style={{ color: '#6366f1', fontWeight: 600 }}>click to browse</span> — any file type supported
            </p>
          </>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, fontSize: '0.85rem', color: '#4ade80' }}>{success}</div>}

      {/* Search */}
      {files.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <input
            className="form-control"
            placeholder="🔍 Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* File list */}
      <div className="card" style={{ padding: '0.5rem' }}>
        {loadingFiles ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <span className="spinner" /> Loading files...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📭</div>
            <p>{files.length === 0 ? `No files in ${bucket} yet — upload something above!` : 'No files match your search.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {filtered.map((file, i) => {
              const color = fileColor(file.name);
              return (
                <div key={file.id || i}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.85rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid transparent', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  {/* Icon */}
                  <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{fileIcon(file.name, file.type)}</div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: 999, background: color + '22', color, border: `1px solid ${color}44`, fontWeight: 600 }}>
                        {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatBytes(file.size || 0)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      onClick={() => downloadFile(file)}
                      title="Download"
                      style={{ padding: '0.35rem 0.6rem', borderRadius: 8, background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}
                    >⬇️</button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(file.id); setSuccess(`Copied: ${file.id}`); }}
                      title="Copy ID"
                      style={{ padding: '0.35rem 0.5rem', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a78bfa', cursor: 'pointer', fontSize: '0.72rem' }}
                    >📋</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick upload button */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', padding: '0.65rem 2rem' }}
        >
          {uploading ? <><span className="spinner" /> Uploading...</> : '☁️ Upload Files'}
        </button>
      </div>
    </div>
  );
}
