// src/app/api/field-boundary/route.ts
// Field boundary — single source of truth: farmer_profile table
// No S3, no session_logs — just one row per farmer

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { dbExecute } from '@/lib/fluxbase';

async function getFarmerId(userId: number, sessionFarmerId?: number): Promise<number | null> {
  if (sessionFarmerId) return sessionFarmerId;
  try {
    const rows = await dbExecute('SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1', [userId]);
    return rows.length ? (rows[0].farmer_id as number) : null;
  } catch { return null; }
}

// ── GET — load saved field boundary ─────────────────────────
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ boundary: null });

  const farmerId = await getFarmerId(session.userId, session.farmerId);
  if (!farmerId) return NextResponse.json({ boundary: null });

  try {
    const rows = await dbExecute(
      'SELECT field_latlngs, field_area_acres, field_center, field_saved_at FROM farmer_profile WHERE farmer_id = ? LIMIT 1',
      [farmerId]
    );
    if (!rows.length || !rows[0].field_latlngs) {
      return NextResponse.json({ boundary: null });
    }
    const latlngs = JSON.parse(rows[0].field_latlngs as string);
    return NextResponse.json({
      boundary: {
        type: 'field_boundary',
        latlngs,
        area_acres: rows[0].field_area_acres,
        center: rows[0].field_center ? JSON.parse(rows[0].field_center as string) : null,
        saved_at: rows[0].field_saved_at,
      },
      source: 'farmer_profile',
    });
  } catch (err) {
    console.error('[FieldBoundary GET]', err);
    return NextResponse.json({ boundary: null });
  }
}

// ── POST — save field boundary into farmer_profile ──────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Please login to save your field.' }, { status: 401 });

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
    return NextResponse.json({
      error: 'Farmer profile not found. Please complete your profile first.',
    }, { status: 400 });

  try {
    await dbExecute(
      `UPDATE farmer_profile
       SET field_latlngs = ?,
           field_area_acres = ?,
           field_center = ?,
           field_saved_at = NOW()
       WHERE farmer_id = ?`,
      [
        JSON.stringify(latlngs),
        area_acres,
        JSON.stringify(center),
        farmerId,
      ]
    );

    return NextResponse.json({
      success: true,
      area_acres,
      storage: 'farmer_profile',
      message: `✅ Field boundary saved (${area_acres} acres)`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Save failed: ${msg.slice(0, 120)}` }, { status: 500 });
  }
}

// ── DELETE — clear field boundary ────────────────────────────
export async function DELETE() {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const farmerId = await getFarmerId(session.userId, session.farmerId);
  if (!farmerId)
    return NextResponse.json({ error: 'No profile' }, { status: 400 });

  try {
    await dbExecute(
      `UPDATE farmer_profile
       SET field_latlngs = NULL,
           field_area_acres = NULL,
           field_center = NULL,
           field_saved_at = NULL
       WHERE farmer_id = ?`,
      [farmerId]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
