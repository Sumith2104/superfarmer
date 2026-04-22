// src/app/api/disease/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { buildContext } from '@/lib/agents/context';
import { runDiseaseAgent } from '@/lib/agents/disease-agent';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Please login to use the Disease Diagnosis Agent.' }, { status: 401 });

  const { symptoms, imageBase64, cropType } = await req.json();
  const ctx = await buildContext(session.userId, session.farmerId, session.planId);
  const result = await runDiseaseAgent(ctx, { symptoms, imageBase64, cropType });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json(result.data);
}
