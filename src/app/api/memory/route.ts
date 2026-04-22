// src/app/api/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMemory, getMemoryByAgent, deleteMemory } from '@/lib/agents/memory';
import { dbExecute } from '@/lib/fluxbase';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get farmerId
  const rows = await dbExecute('SELECT farmer_id FROM farmer_profile WHERE user_id=? LIMIT 1', [session.userId]);
  const farmerId = (rows[0]?.farmer_id as number) ?? session.farmerId;
  if (!farmerId) return NextResponse.json({ entries: [] });

  const { searchParams } = new URL(req.url);
  const agent = searchParams.get('agent');
  const limit = parseInt(searchParams.get('limit') ?? '30');

  const entries = agent
    ? await getMemoryByAgent(farmerId, agent, limit)
    : await getMemory(farmerId, limit);

  return NextResponse.json({ entries });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await dbExecute('SELECT farmer_id FROM farmer_profile WHERE user_id=? LIMIT 1', [session.userId]);
  const farmerId = (rows[0]?.farmer_id as number) ?? session.farmerId;
  if (!farmerId) return NextResponse.json({ error: 'No profile' }, { status: 400 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await deleteMemory(Number(id), farmerId);
  return NextResponse.json({ ok: true });
}
