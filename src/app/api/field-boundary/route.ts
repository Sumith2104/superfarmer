// src/app/api/field-boundary/route.ts
// Saves/loads farmer field boundaries as GeoJSON files via FluxBase Storage

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { dbExecute, storageCreateBucket, storageUpload, storageList, storageDownload } from '@/lib/fluxbase';

const BUCKET_NAME = 'superfarmer-fields';

// Helper — resolve farmerId from session or DB
async function getFarmerId(userId: number, sessionFarmerId?: number): Promise<number | null> {
  if (sessionFarmerId) return sessionFarmerId;
  try {
    const rows = await dbExecute('SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1', [userId]);
    return rows.length ? (rows[0].farmer_id as number) : null;
  } catch { return null; }
}

async function ensureBucket(): Promise<string> {
  const id = await storageCreateBucket(BUCKET_NAME, false);
  return id ?? BUCKET_NAME;
}

// ── GET — load saved field boundary ──────────────────────
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ boundary: null });

  const farmerId = await getFarmerId(session.userId, session.farmerId);
  if (!farmerId) return NextResponse.json({ boundary: null });

  // ── Fast path: DB first (always < 1s) ────────────────
  try {
    const rows = await dbExecute(
      `SELECT interaction_log FROM session_logs
       WHERE farmer_id = ? AND interaction_log LIKE '%"type":"field_boundary"%'
       ORDER BY session_date DESC LIMIT 1`,
      [farmerId]
    );
    if (rows.length) {
      const parsed = JSON.parse(rows[0].interaction_log as string);
      return NextResponse.json({ boundary: parsed, source: 'db' });
    }
  } catch (e) {
    console.warn('[FieldBoundary GET] DB lookup failed:', e);
  }

  // ── Slow path: try FluxBase S3 (only if nothing in DB) ──
  try {
    const prefix = `farmer_${farmerId}_boundary`;
    const files = await storageList(BUCKET_NAME, prefix);

    if (files.length) {
      const latest = files.sort((a, b) => b.name.localeCompare(a.name))[0];
      const content = await storageDownload(latest.id);
      if (content) {
        const geojson = JSON.parse(content);
        const coords: [number, number][] = geojson.geometry?.coordinates?.[0] ?? [];
        const latlngs: [number, number][] = coords
          .slice(0, -1)
          .map(([lng, lat]: [number, number]) => [lat, lng]);
        return NextResponse.json({
          boundary: {
            type: 'field_boundary',
            latlngs,
            area_acres: geojson.properties?.area_acres,
            center: geojson.properties?.center,
            saved_at: geojson.properties?.saved_at,
          },
          source: 'fluxbase-s3',
        });
      }
    }
  } catch (e) {
    console.warn('[FieldBoundary GET] S3 lookup failed (expected if slow):', e);
  }

  return NextResponse.json({ boundary: null });
}


// ── POST — save field boundary as GeoJSON file ───────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Please login to save your field.' }, { status: 401 });

  // Parse body once — reuse in fallback
  let body: { latlngs: [number, number][]; area_acres: number; center: { lat: number; lng: number } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { latlngs, area_acres, center } = body;
  if (!latlngs?.length)
    return NextResponse.json({ error: 'No boundary coordinates provided.' }, { status: 400 });

  const farmerId = await getFarmerId(session.userId, session.farmerId);
  if (!farmerId)
    return NextResponse.json({ error: 'Farmer profile not found. Please complete the intake form first.' }, { status: 400 });

  // ── Attempt 1: FluxBase file storage ─────────────────────
  try {
    const geojson = {
      type: 'Feature',
      properties: {
        farmer_id: farmerId,
        area_acres,
        center,
        saved_at: new Date().toISOString(),
        app: 'SuperFarmer Spatial Twin',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          ...latlngs.map(([lat, lng]) => [lng, lat]),
          [latlngs[0][1], latlngs[0][0]], // close GeoJSON ring
        ]],
      },
    };

    const bucketId = await ensureBucket();
    const fileName = `farmer_${farmerId}_boundary_${Date.now()}.geojson`;

    const file = await storageUpload(
      bucketId,
      fileName,
      JSON.stringify(geojson, null, 2),
      'application/geo+json'
    );

    return NextResponse.json({
      success: true,
      area_acres,
      file_id: file?.id,
      file_name: fileName,
      storage: 'fluxbase-s3',
      message: `✅ Saved as ${fileName}`,
    });
  } catch (storageErr) {
    console.warn('[FieldBoundary] Storage failed, falling back to DB:', storageErr);
  }

  // ── Fallback: session_logs DB ─────────────────────────────
  try {
    const log = JSON.stringify({
      type: 'field_boundary',
      latlngs,
      area_acres,
      center,
      saved_at: new Date().toISOString(),
    });
    await dbExecute(
      'INSERT INTO session_logs (farmer_id, interaction_log) VALUES (?, ?)',
      [farmerId, log]
    );
    return NextResponse.json({
      success: true,
      area_acres,
      storage: 'db-fallback',
      message: '✅ Saved to database (file storage unavailable).',
    });
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    return NextResponse.json({ error: `Save failed: ${msg.slice(0, 120)}` }, { status: 500 });
  }
}
