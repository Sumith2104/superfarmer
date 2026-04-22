// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runDashboardAgent } from '@/lib/agents/dashboard-agent';

export async function GET() {
  const session = await getSession();
  if (!session.userId || !session.farmerId) {
    return NextResponse.json({ error: 'Account not initialized. Complete intake first.' }, { status: 403 });
  }

  try {
    const ctx = await buildContext(session.userId, session.farmerId, session.planId);
    const result = await runDashboardAgent(ctx);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
