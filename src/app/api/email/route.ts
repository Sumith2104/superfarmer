// src/app/api/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { runEmailAgent } from '@/lib/agents/email-agent';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, subject, text } = await req.json();
  const result = await runEmailAgent(to || '', subject || '', text || '');

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
