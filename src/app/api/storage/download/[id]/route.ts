// src/app/api/storage/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { storageDownload } from '@/lib/fluxbase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;

  try {
    const content = await storageDownload(id);
    if (!content) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const fileName = req.nextUrl.searchParams.get('name') || 'download';
    return new NextResponse(content, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
