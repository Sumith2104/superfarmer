// src/app/api/report/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runReportAgent } from '@/lib/agents/report-agent';

export async function GET() {
  const session = await getSession();
  if (!session.farmerId)
    return NextResponse.json({ error: 'Farmer profile required. Please complete intake first.' }, { status: 401 });

  const ctx = await buildContext(session.userId!, session.farmerId, session.planId);
  const result = await runReportAgent(ctx);

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({
    report: result.data!.report,
    sections: result.data!.sections,
    trace: result.trace,
  });
}
