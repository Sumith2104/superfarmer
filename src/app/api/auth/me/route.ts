// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    loggedIn: !!session.userId,
    userId: session.userId ?? null,
    farmerId: session.farmerId ?? null,
  });
}
