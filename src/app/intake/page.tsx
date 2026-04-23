// src/app/intake/page.tsx
// SERVER COMPONENT — runs on the server, checks DB before page renders.
// If profile already exists → redirect to / immediately (no flicker, no bypass).
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { dbExecute } from '@/lib/fluxbase';
import IntakeForm from './IntakeForm';

export default async function IntakePage() {
  // 1. Must be logged in
  const session = await getSession();
  if (!session.userId) redirect('/login');

  // 2. Fast-path check: If session already has farmerId, profile is definitely complete
  if (session.farmerId) redirect('/');

  // 3. Fallback check: Check DB directly — if ANY row exists for this user, profile is already set up
  try {
    const rows = await dbExecute(
      'SELECT farmer_id FROM farmer_profile WHERE user_id = ? LIMIT 1',
      [session.userId]
    );
    if (rows && rows.length > 0) {
      // Profile exists — save to session for future and redirect
      session.farmerId = rows[0].farmer_id as number;
      await session.save();
      redirect('/');
    }
  } catch {
    // DB error — let them through to the form rather than blocking
  }

  // 3. No profile found — show the setup form (first time only)
  return <IntakeForm />;
}
