// src/app/api/debug/login/route.ts
// Temporary debug route — shows exactly WHY login fails. Remove in production!
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbExecute } from '@/lib/fluxbase';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const rows = await dbExecute(
    'SELECT user_id, password_hash FROM users WHERE email = ?',
    [email]
  );

  if (!rows.length) {
    return NextResponse.json({ step: 'USER_NOT_FOUND', email, hint: 'No user row exists with this email' });
  }

  const user = rows[0] as { user_id: number; password_hash: string };
  const hash = user.password_hash;

  const info: Record<string, unknown> = {
    user_id: user.user_id,
    hash_length: hash.length,
    hash_prefix: hash.slice(0, 50) + '…',
    starts_with_scrypt: hash.startsWith('scrypt:'),
    starts_with_bcrypt: hash.startsWith('$2'),
  };

  if (hash.startsWith('scrypt:')) {
    const parts = hash.split('$');
    info.dollar_part_count = parts.length;
    if (parts.length === 3) {
      const [params, salt, hexHash] = parts;
      info.params = params;
      info.salt = salt;
      info.hex_hash_length = hexHash.length;
      info.expected_dkLen = hexHash.length / 2;
      const [, N, r, p] = params.split(':');
      try {
        const dkLen = hexHash.length / 2;
        const derived = crypto.scryptSync(password, salt, dkLen, { N: parseInt(N), r: parseInt(r), p: parseInt(p) });
        const derivedHex = derived.toString('hex');
        info.derived_hex_prefix = derivedHex.slice(0, 20);
        info.stored_hex_prefix = hexHash.slice(0, 20);
        info.match = derivedHex === hexHash;
        info.step = info.match ? 'SCRYPT_MATCH_OK' : 'SCRYPT_MISMATCH';
      } catch (e) {
        info.step = 'SCRYPT_ERROR';
        info.error = String(e);
      }
    } else {
      info.step = 'SCRYPT_BAD_FORMAT';
    }
  } else if (hash.startsWith('$2')) {
    const match = await bcrypt.compare(password, hash);
    info.step = match ? 'BCRYPT_MATCH_OK' : 'BCRYPT_MISMATCH';
    info.match = match;
  } else {
    info.step = 'UNKNOWN_HASH_FORMAT';
  }

  return NextResponse.json(info);
}
