// src/app/api/admin/migrate/route.ts
// ONE-TIME migration endpoint — run once at /api/admin/migrate then delete this file
import { NextResponse } from 'next/server';
import { dbExecute } from '@/lib/fluxbase';

const MIGRATIONS = [
  `ALTER TABLE farmer_profile ADD COLUMN phone VARCHAR(20)`,
  `ALTER TABLE farmer_profile ADD COLUMN village VARCHAR(100)`,
  `ALTER TABLE farmer_profile ADD COLUMN district VARCHAR(100)`,
  `ALTER TABLE farmer_profile ADD COLUMN state VARCHAR(100)`,
  `ALTER TABLE farmer_profile ADD COLUMN land_acres DECIMAL(8,2)`,
  `ALTER TABLE farmer_profile ADD COLUMN soil_type VARCHAR(50)`,
  `ALTER TABLE farmer_profile ADD COLUMN irrigation VARCHAR(50)`,
  `ALTER TABLE farmer_profile ADD COLUMN primary_crops TEXT`,
  `ALTER TABLE farmer_profile ADD COLUMN economic_class VARCHAR(50)`,
  `ALTER TABLE farmer_profile ADD COLUMN preferred_lang VARCHAR(10) DEFAULT 'en'`,
  `ALTER TABLE farmer_profile ADD COLUMN profile_pct INT DEFAULT 0`,
  `ALTER TABLE farmer_profile ADD COLUMN field_latlngs TEXT`,
  `ALTER TABLE farmer_profile ADD COLUMN field_area_acres DECIMAL(10,4)`,
  `ALTER TABLE farmer_profile ADD COLUMN field_center TEXT`,
  `ALTER TABLE farmer_profile ADD COLUMN field_saved_at DATETIME`,
];

export async function GET() {
  const results: { sql: string; status: string }[] = [];

  for (const sql of MIGRATIONS) {
    try {
      await dbExecute(sql);
      results.push({ sql: sql.replace('ALTER TABLE farmer_profile ADD COLUMN ', ''), status: '✅ ok' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const label = sql.replace('ALTER TABLE farmer_profile ADD COLUMN ', '');
      if (
        msg.toLowerCase().includes('duplicate column name') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('already exists')
      ) {
        results.push({ sql: label, status: '⏭️ already exists' });
      } else {
        results.push({ sql: label, status: `❌ ${msg.slice(0, 150)}` });
      }
    }
  }

  const allOk = results.every(r => r.status.startsWith('✅') || r.status.startsWith('⏭️'));

  return NextResponse.json({
    message: allOk ? '✅ All migrations complete!' : '⚠️ Some migrations failed — check results.',
    results,
  });
}
