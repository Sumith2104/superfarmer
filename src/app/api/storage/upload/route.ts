// src/app/api/storage/upload/route.ts
// Proxy file uploads to FluxBase S3 storage

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { storageCreateBucket, storageUpload } from '@/lib/fluxbase';

const DEFAULT_BUCKET = 'superfarmer-files';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Please login first.' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || DEFAULT_BUCKET;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

    // Ensure bucket exists
    await storageCreateBucket(bucket, false);

    // Read file bytes
    const buffer = await file.arrayBuffer();
    const uploaded = await storageUpload(bucket, file.name, buffer, file.type || 'application/octet-stream');

    return NextResponse.json({
      success: true,
      file: {
        id: uploaded?.id,
        name: file.name,
        size: file.size,
        type: file.type,
        bucket,
        url: uploaded?.url,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Storage Upload]', msg);
    return NextResponse.json({ error: msg.slice(0, 200) }, { status: 500 });
  }
}
