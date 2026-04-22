// src/app/api/spatial-planner/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runSpatialAgent } from '@/lib/agents/spatial-agent';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Please login to use the Spatial Planner.' }, { status: 401 });

  const body = await req.json();
  const { width, height, main_crop, companion_crops, land_size, view_mode } = body;
  const ctx = await buildContext(session.userId, session.farmerId, session.planId);
  const result = await runSpatialAgent(ctx, { width, height, main_crop, companion_crops, land_size, view_mode });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result.data);
}
