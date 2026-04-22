// src/app/api/storage/list/route.ts
// List files in a FluxBase storage bucket

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { storageList } from '@/lib/fluxbase';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const bucket = req.nextUrl.searchParams.get('bucket') || 'superfarmer-files';
  const prefix = req.nextUrl.searchParams.get('prefix') || '';

  try {
    const files = await storageList(bucket, prefix || undefined);
    return NextResponse.json({ files });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, files: [] });
  }
}
