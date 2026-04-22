// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { runSignupAgent } from '@/lib/agents/auth-agent';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const result = await runSignupAgent(email, password);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    const session = await getSession();
    session.userId = result.data!.userId;
    session.email = result.data!.email;
    await session.save();

    // Trigger email (legacy pattern, will modularize later)
    try {
      await fetch(new URL('/api/email', req.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Welcome to SuperFarmer!',
          text: `<h1>Welcome!</h1><p>Your agricultural journey starts here.</p>`,
        }),
      });
    } catch (e) { console.error('Welcome email failed', e); }

    return NextResponse.json({ success: true, userId: result.data!.userId });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
