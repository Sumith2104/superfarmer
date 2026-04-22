// src/app/api/intake/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runIntakeAgent } from '@/lib/agents/intake-agent';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const ctx = await buildContext(session.userId);
  const result = await runIntakeAgent(ctx, body);

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  session.farmerId = result.data!.farmerId;
  await session.save();

  return NextResponse.json({ success: true, farmerId: result.data!.farmerId });
}
