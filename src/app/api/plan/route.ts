// src/app/api/plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext, saveMemory } from '@/lib/agents/context';
import { runPlanAgent } from '@/lib/agents/plan-agent';
import { dbExecute } from '@/lib/fluxbase';

export async function GET() {
  const session = await getSession();
  if (!session.farmerId) return NextResponse.json({ plan: null });

  const rows = await dbExecute(
    'SELECT * FROM crop_plans WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 1',
    [session.farmerId]
  );
  const plan = rows[0] as Record<string, unknown> | undefined;
  if (plan && !session.planId) {
    session.planId = plan.plan_id as number;
    await session.save();
  }
  return NextResponse.json({ plan: plan || null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.farmerId)
    return NextResponse.json({ error: 'No farmer profile found. Please complete intake first.' }, { status: 401 });

  const { crop_name } = await req.json();
  const ctx = await buildContext(session.userId!, session.farmerId, session.planId);
  const result = await runPlanAgent(ctx, crop_name);

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  // Update session with new planId
  if (result.data?.plan_id) {
    session.planId = result.data.plan_id;
    await session.save();
  }

  return NextResponse.json(result.data);
}
