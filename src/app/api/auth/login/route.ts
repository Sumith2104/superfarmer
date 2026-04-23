// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { runLoginAgent } from '@/lib/agents/auth-agent';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const result = await runLoginAgent(email, password);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 401 });

    const session = await getSession();
    session.userId = result.data!.userId;
    session.email = result.data!.email;

    // Check if farmer profile exists and set in session
    const { dbExecute } = await import('@/lib/fluxbase');
    const farmerRows = await dbExecute('SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1', [result.data!.userId]);
    if (farmerRows.length) {
      session.farmerId = farmerRows[0].farmer_id as number;
    }

    await session.save();

    // Trigger alert email (non-blocking)
    try {
      void fetch(new URL('/api/email', req.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'New Login Alert',
          text: `<p>New login detected from your account on ${new Date().toLocaleString()}. If this wasn't you, please change your password.</p>`,
        }),
      });
    } catch (e) { /* ignore email failures on login */ }

    return NextResponse.json({ success: true, userId: result.data!.userId, farmerId: farmerRows.length ? farmerRows[0].farmer_id : null });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
