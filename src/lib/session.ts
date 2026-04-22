// src/lib/session.ts
import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: number;
  farmerId?: number;
  email?: string;
  planId?: number;
  lastRec?: Record<string, unknown>;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'change_this_to_a_long_secret_of_at_least_32_chars!!',
  cookieName: 'superfarmer_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
