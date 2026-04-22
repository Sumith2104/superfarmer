// Run once: node scripts/migrate-memory.mjs
// Creates the agent_memory table in Fluxbase

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const FLUXBASE_URL = (process.env.FLUXBASE_URL ?? 'https://fluxbase.vercel.app').replace(/\/$/, '');
const PROJECT_ID = process.env.FLUXBASE_PROJECT_ID ?? '';
const API_KEY = process.env.FLUXBASE_API_KEY ?? '';

if (!PROJECT_ID || !API_KEY) {
  console.error('❌  Set FLUXBASE_URL, FLUXBASE_PROJECT_ID, FLUXBASE_API_KEY in .env.local');
  process.exit(1);
}

const queries = [
  // Agent memory table
  `CREATE TABLE IF NOT EXISTS agent_memory (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id    INT NOT NULL,
    agent        VARCHAR(50) NOT NULL,
    action_type  VARCHAR(50) DEFAULT 'query',
    input_text   TEXT,
    output_text  TEXT,
    tools_used   TEXT,
    metadata     JSON,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_farmer (farmer_id),
    INDEX idx_agent (agent)
  )`,

  // Add missing columns to farmer_profile if they don't exist
  `ALTER TABLE farmer_profile
    ADD COLUMN IF NOT EXISTS preferred_lang VARCHAR(10) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS economic_class VARCHAR(20),
    ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS profile_pct INT DEFAULT 0`,
];

async function run(sql) {
  const res = await fetch(`${FLUXBASE_URL}/api/execute-sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, projectId: PROJECT_ID }),
  });
  const data = await res.json();
  if (data.success === false) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data;
}

for (const sql of queries) {
  const preview = sql.trim().slice(0, 60).replace(/\s+/g, ' ');
  try {
    await run(sql);
    console.log(`✅  ${preview}…`);
  } catch (err) {
    console.warn(`⚠️  ${preview}… — ${err.message}`);
  }
}

console.log('\n✅  Migration complete.');
