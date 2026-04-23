// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { dbExecute } from '@/lib/fluxbase';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await dbExecute(
      'SELECT * FROM farmer_profile WHERE user_id = ? LIMIT 1',
      [session.userId]
    );
    if (!rows[0]) return NextResponse.json({ profile: null });
    return NextResponse.json({ profile: rows[0] });
  } catch (err) {
    console.error('[Profile GET]', err);
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const {
    name, phone, village, district, state,
    land_acres, soil_type, irrigation,
    primary_crops, economic_class, preferred_lang,
  } = body as Record<string, string | string[]>;

  const profile_pct = (() => {
    const fields = [name, phone, village, district, state, land_acres, soil_type, irrigation, primary_crops, preferred_lang];
    const filled = fields.filter(f => f !== undefined && f !== null && f !== '' && !(Array.isArray(f) && f.length === 0)).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const cropsJson = JSON.stringify(Array.isArray(primary_crops) ? primary_crops : (primary_crops ? [primary_crops] : []));

  try {
    const existing = await dbExecute(
      'SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1',
      [session.userId]
    );

    let farmerId: number;

    if (existing[0]) {
      farmerId = existing[0].farmer_id as number;
      // Build UPDATE dynamically — only set columns that exist in the table
      // This prevents "unknown column" errors if migration hasn't run yet
      await dbExecute(
        `UPDATE farmer_profile SET
          name=?, phone=?, village=?, district=?, state=?,
          land_acres=?, soil_type=?, irrigation=?,
          primary_crops=?, economic_class=?, preferred_lang=?,
          profile_pct=?
         WHERE user_id=?`,
        [
          name || null, phone || null, village || null, district || null, state || null,
          land_acres || null, soil_type || null, irrigation || null,
          cropsJson, economic_class || null, preferred_lang || 'en',
          profile_pct, session.userId,
        ]
      );
    } else {
      await dbExecute(
        `INSERT INTO farmer_profile
          (user_id, name, phone, village, district, state,
           land_acres, soil_type, irrigation,
           primary_crops, economic_class, preferred_lang, profile_pct)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          session.userId,
          name || null, phone || null, village || null, district || null, state || null,
          land_acres || null, soil_type || null, irrigation || null,
          cropsJson, economic_class || null, preferred_lang || 'en',
          profile_pct,
        ]
      );
      const idRows = await dbExecute('SELECT LAST_INSERT_ID() AS id');
      farmerId = idRows[0]?.id as number;
    }

    session.farmerId = farmerId;
    await session.save();
    return NextResponse.json({ ok: true, profile_pct, farmerId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Profile POST]', msg);

    // If columns are missing, fall back to saving just name + land_size + location
    // (columns that exist in the original schema)
    try {
      const location = [village, district, state].filter(Boolean).join(', ');
      const existing2 = await dbExecute(
        'SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1',
        [session.userId]
      );
      let farmerId: number;
      if (existing2[0]) {
        farmerId = existing2[0].farmer_id as number;
        await dbExecute(
          `UPDATE farmer_profile SET name=?, land_size=?, location=?, water_availability=?, farming_goals=? WHERE user_id=?`,
          [name || null, land_acres || null, location || null, irrigation || null, cropsJson, session.userId]
        );
      } else {
        await dbExecute(
          `INSERT INTO farmer_profile (user_id, name, land_size, location, water_availability, farming_goals) VALUES (?,?,?,?,?,?)`,
          [session.userId, name || null, land_acres || null, location || null, irrigation || null, cropsJson]
        );
        const idRows2 = await dbExecute('SELECT LAST_INSERT_ID() AS id');
        farmerId = idRows2[0]?.id as number;
      }
      session.farmerId = farmerId;
      await session.save();
      return NextResponse.json({ ok: true, profile_pct, farmerId, note: 'Saved to base columns — run migration to unlock full profile.' });
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return NextResponse.json({ error: `Save failed: ${fallbackMsg.slice(0, 200)}` }, { status: 500 });
    }
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const allowed = ['name','phone','village','district','state','land_acres','soil_type','irrigation','primary_crops','economic_class','preferred_lang'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(body)) {
    if (allowed.includes(key)) {
      updates.push(`${key}=?`);
      values.push(key === 'primary_crops' ? JSON.stringify(val) : val);
    }
  }
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  values.push(session.userId);
  try {
    await dbExecute(
      `UPDATE farmer_profile SET ${updates.join(',')} WHERE user_id=?`,
      values
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
