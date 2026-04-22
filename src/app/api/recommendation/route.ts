// src/app/api/recommendation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runRecommendationAgent } from '@/lib/agents/recommendation-agent';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.farmerId)
    return NextResponse.json({ error: 'No farmer profile found. Please complete intake first.' }, { status: 401 });

  const { soil_type, water_const, season, goal } = await req.json();
  const ctx = await buildContext(session.userId!, session.farmerId, session.planId);
  const result = await runRecommendationAgent(ctx, { soil_type, water_const, season, goal });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result.data);
}
