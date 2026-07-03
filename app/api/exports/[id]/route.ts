import { verifyAndConsume } from '@/lib/exports';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;

  // Parse query params from the signed URL (passed as /api/exports/{id}?expiry=X&hmac=Y)
  const searchParams = new URLSearchParams(_request.nextUrl.searchParams);
  const expiry = searchParams.get('expiry');
  const hmac = searchParams.get('hmac');

  if (!expiry || !hmac) {
    return Response.json({ error: 'Invalid export link.' }, { status: 403 });
  }

  const file = verifyAndConsume(rawId, expiry, hmac);
  if (!file) {
    return Response.json({ error: 'Export link expired or already used.' }, { status: 410 });
  }

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
