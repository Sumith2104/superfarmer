// src/lib/fluxbase.ts
// Fluxbase client — SQL + Storage (S3-backed) utilities

const FLUXBASE_URL = (process.env.FLUXBASE_URL || 'https://fluxbase.vercel.app').replace(/\/$/, '').replace(/\/api$/, '');
const PROJECT_ID   = process.env.FLUXBASE_PROJECT_ID || '';
const API_KEY      = process.env.FLUXBASE_API_KEY    || '';

// Per-operation timeouts
const TIMEOUT_SQL      = 8000;  // DB queries
const TIMEOUT_UPLOAD   = 20000; // File uploads (GeoJSON can be slow)
const TIMEOUT_STORAGE  = 5000;  // List / download

const AUTH_HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
};

/** Fetch with a hard timeout — aborts if storage hangs */
async function fetchWithTimeout(url: string, opts: RequestInit, ms = TIMEOUT_SQL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type Row = Record<string, unknown>;

// ── Fluxbase rate-limit cooldown ──────────────────────────
// If ANY dbExecute gets a 429, stop ALL DB calls for 30s.
// This prevents the thundering herd where N concurrent requests
// each retry 3× creating 3N more requests.
let dbCooldownUntil = 0;
const DB_COOLDOWN_MS = 30_000;

function isDbOnCooldown(): boolean { return Date.now() < dbCooldownUntil; }
function setDbCooldown() {
  dbCooldownUntil = Date.now() + DB_COOLDOWN_MS;
  console.warn(`[Fluxbase] 429 — DB on cooldown for ${DB_COOLDOWN_MS / 1000}s. Returning empty results.`);
}

// ── Simple in-memory query cache ─────────────────────────
const dbCache = new Map<string, { rows: Row[]; exp: number }>();
const DB_CACHE_TTL = 15_000; // 15s cache for identical queries

// ── SQL ───────────────────────────────────────────────────
export async function dbExecute(query: string, params?: unknown[]): Promise<Row[]> {
  // Return empty immediately if on cooldown
  if (isDbOnCooldown()) return [];

  // Cache key — skip cache for INSERT/UPDATE/DELETE
  const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(query);
  const cacheKey = isWrite ? '' : `${query}|${JSON.stringify(params ?? [])}`;

  if (cacheKey) {
    const hit = dbCache.get(cacheKey);
    if (hit && Date.now() < hit.exp) return hit.rows;
  }

  const res = await fetchWithTimeout(`${FLUXBASE_URL}/api/execute-sql`, {
    method: 'POST',
    headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, projectId: PROJECT_ID, ...(params?.length ? { params } : {}) }),
  }, TIMEOUT_SQL);

  if (res.status === 429) {
    setDbCooldown();
    return []; // return empty, don't throw — callers handle missing data gracefully
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fluxbase SQL ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.success === false) throw new Error(data.error?.message ?? 'Query failed');
  const rows = (data?.result?.rows ?? []) as Row[];

  // Cache read results
  if (cacheKey) dbCache.set(cacheKey, { rows, exp: Date.now() + DB_CACHE_TTL });

  return rows;
}

export async function dbLastInsertId(): Promise<number> {
  const rows = await dbExecute('SELECT LAST_INSERT_ID() AS id');
  return (rows[0]?.id as number) ?? 0;
}

// ── Storage ───────────────────────────────────────────────

/** Create a bucket (idempotent — ignores "already exists" errors) */
export async function storageCreateBucket(name: string, isPublic = false): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${FLUXBASE_URL}/api/storage/buckets`, {
      method: 'POST',
      headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: PROJECT_ID, name, isPublic }),
    });
    const data = await res.json();
    // Return bucket id or name (server may return id)
    return data?.bucket?.id ?? data?.id ?? name;
  } catch {
    // Bucket probably already exists, return the name as id
    return name;
  }
}

/** Upload any file to a bucket. Returns the file record from Fluxbase. */
export async function storageUpload(
  bucketId: string,
  fileName: string,
  content: string | ArrayBuffer,
  contentType = 'application/octet-stream'
): Promise<{ id: string; name: string; url?: string } | null> {
  const formData = new FormData();
  const blob = new Blob([content as BlobPart], { type: contentType });
  formData.append('file', blob, fileName);
  formData.append('bucketId', bucketId);
  formData.append('projectId', PROJECT_ID);

  const res = await fetchWithTimeout(`${FLUXBASE_URL}/api/storage/upload`, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: formData,
  }, TIMEOUT_UPLOAD);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fluxbase Storage upload ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.success && !data.file) throw new Error(data.error ?? 'Upload failed');
  return data.file ?? null;
}

/** Download a file by its Fluxbase file ID. Returns the raw text content. */
export async function storageDownload(fileId: string): Promise<string | null> {
  // Try download endpoint
  const res = await fetchWithTimeout(`${FLUXBASE_URL}/api/storage/files/${fileId}`, {
    headers: AUTH_HEADERS,
  }, TIMEOUT_STORAGE);
  if (!res.ok) return null;
  const text = await res.text();
  return text;
}

/** List files in a bucket filtered by a name prefix */
export async function storageList(bucketId: string, prefix?: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const params = new URLSearchParams({ projectId: PROJECT_ID, bucketId });
    if (prefix) params.set('prefix', prefix);
    const res = await fetchWithTimeout(`${FLUXBASE_URL}/api/storage/files?${params}`, {
      headers: AUTH_HEADERS,
    }, TIMEOUT_STORAGE);
    if (!res.ok) return [];
    const data = await res.json();
    return data.files ?? data.data ?? [];
  } catch { return []; }
}
