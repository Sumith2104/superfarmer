// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { dbExecute } from '@/lib/fluxbase';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await dbExecute(
    'SELECT * FROM farmer_profile WHERE user_id = ? LIMIT 1',
    [session.userId]
  );
  if (!rows[0]) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: rows[0] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    name, phone, village, district, state,
    land_acres, soil_type, irrigation,
    primary_crops, economic_class, preferred_lang,
  } = body;

  // Calculate completion %
  const fields = [name, phone, village, district, state, land_acres, soil_type, irrigation, primary_crops, preferred_lang];
  const filled = fields.filter(f => f !== undefined && f !== null && f !== '').length;
  const profile_pct = Math.round((filled / fields.length) * 100);

  const existing = await dbExecute(
    'SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1',
    [session.userId]
  );

  if (existing[0]) {
    await dbExecute(
      `UPDATE farmer_profile SET
        name=?, phone=?, village=?, district=?, state=?,
        land_acres=?, soil_type=?, irrigation=?,
        primary_crops=?, economic_class=?, preferred_lang=?,
        profile_pct=?, updated_at=NOW()
       WHERE user_id=?`,
      [name, phone, village, district, state,
       land_acres, soil_type, irrigation,
       JSON.stringify(primary_crops ?? []), economic_class, preferred_lang,
       profile_pct, session.userId]
    );
    const farmerId = existing[0].farmer_id as number;
    // Update session
    session.farmerId = farmerId;
    await session.save();
    return NextResponse.json({ ok: true, profile_pct, farmerId });
  } else {
    await dbExecute(
      `INSERT INTO farmer_profile
        (user_id, name, phone, village, district, state,
         land_acres, soil_type, irrigation,
         primary_crops, economic_class, preferred_lang, profile_pct)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [session.userId, name, phone, village, district, state,
       land_acres, soil_type, irrigation,
       JSON.stringify(primary_crops ?? []), economic_class, preferred_lang,
       profile_pct]
    );
    const idRows = await dbExecute('SELECT LAST_INSERT_ID() AS id');
    const farmerId = idRows[0]?.id as number;
    session.farmerId = farmerId;
    await session.save();
    return NextResponse.json({ ok: true, profile_pct, farmerId });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const allowedFields = ['name','phone','village','district','state','land_acres','soil_type','irrigation','primary_crops','economic_class','preferred_lang'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key}=?`);
      values.push(key === 'primary_crops' ? JSON.stringify(val) : val);
    }
  }
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  values.push(session.userId);
  await dbExecute(
    `UPDATE farmer_profile SET ${updates.join(',')}, updated_at=NOW() WHERE user_id=?`,
    values
  );
  return NextResponse.json({ ok: true });
}
