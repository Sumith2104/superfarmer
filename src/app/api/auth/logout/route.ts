// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}

// Support both DELETE and POST for flexibility
export { POST as DELETE };
