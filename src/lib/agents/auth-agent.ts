// src/lib/agents/auth-agent.ts
// AuthAgent — handles secure user authentication, signup, and legacy password verification

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { dbExecute, dbLastInsertId } from '@/lib/fluxbase';
import type { AgentResult } from './types';

export interface UserAuthData {
  userId: number;
  email: string;
}

/**
 * Verifies legacy Werkzeug scrypt hashes (scrypt:N:r:p$salt$hash)
 */
function verifyLegacyHash(password: string, hash: string): boolean {
  if (!hash.startsWith('scrypt:')) return false;
  try {
    const [header, salt, hexHash] = hash.split('$');
    const parts = header.split(':');
    const n = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);

    const maxmem = 128 * n * r * p + 32 * 1024 * 1024;
    const derivedKey = crypto.scryptSync(password, salt, 64, { N: n, r, p, maxmem });
    return derivedKey.toString('hex') === hexHash;
  } catch (err) {
    console.error('Legacy hash verification error:', err);
    return false;
  }
}

export async function runSignupAgent(
  email: string,
  password: string
): Promise<AgentResult<UserAuthData>> {
  const trace: string[] = ['Step 1: Commencing signup for ' + email + '...'];
  try {
    trace.push('Step 2: Checking if user already exists...');
    const existing = await dbExecute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) return { success: false, error: 'User already exists', trace };

    trace.push('Step 3: Hashing password with bcrypt...');
    const hashedPw = await bcrypt.hash(password, 10);
    
    trace.push('Step 4: Creating user record in database...');
    await dbExecute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hashedPw]);
    const userId = await dbLastInsertId();
    trace.push(`Step 4 ✓: User created with ID #${userId}`);

    return { success: true, data: { userId, email }, trace };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Signup failed';
    trace.push(`Step 3/4 ✗: ${errorMsg}`);
    return { success: false, error: errorMsg, trace };
  }
}

export async function runLoginAgent(
  email: string,
  password: string
): Promise<AgentResult<UserAuthData>> {
  const trace: string[] = ['Step 1: Commencing login attempt for ' + email + '...'];
  try {
    trace.push('Step 2: Fetching user record from database...');
    const userRows = await dbExecute('SELECT user_id, password_hash FROM users WHERE email = ?', [email]);
    if (!userRows.length) return { success: false, error: 'Invalid email or password', trace };

    const { user_id, password_hash } = userRows[0] as { user_id: number; password_hash: string };
    trace.push('Step 3: Verifying password (trying bcrypt then legacy scrypt)...');

    let isValid = false;
    if (password_hash.startsWith('scrypt:')) {
      isValid = verifyLegacyHash(password, password_hash);
      trace.push('Step 3 ✓: Legacy scrypt verification ' + (isValid ? 'successful' : 'failed'));
    } else {
      isValid = await bcrypt.compare(password, password_hash);
      trace.push('Step 3 ✓: Bcrypt verification ' + (isValid ? 'successful' : 'failed'));
    }

    if (!isValid) return { success: false, error: 'Invalid email or password', trace };

    return { success: true, data: { userId: user_id as number, email }, trace };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Login failed';
    trace.push(`Step 3 ✗: ${errorMsg}`);
    return { success: false, error: errorMsg, trace };
  }
}
