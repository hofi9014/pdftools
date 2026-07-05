import { storeFile, signExportUrl, checkRateLimit } from '@/lib/exports';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
  const secret = process.env.EXPORT_LINK_HMAC_SECRET;
  if (!secret) {
    return Response.json({ error: 'Export service not configured.' }, { status: 503 });
  }

  const clientIp = getClientIp(request);
  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return Response.json({ error: 'Empty file.' }, { status: 400 });
    }

    const id = storeFile(buffer, file.type || 'application/octet-stream', file.name);
    const signed = signExportUrl(id);

    return Response.json(
      { url: `/api/exports/${signed}` },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      },
    );
  } catch {
    return Response.json({ error: 'Failed to process upload.' }, { status: 500 });
  }
}
