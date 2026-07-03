import { storeFile, signExportUrl } from '@/lib/exports';

export async function POST(request: Request) {
  const secret = process.env.EXPORT_LINK_HMAC_SECRET;
  if (!secret) {
    return Response.json({ error: 'Export service not configured.' }, { status: 503 });
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

    return Response.json({ url: `/api/exports/${signed}` });
  } catch {
    return Response.json({ error: 'Failed to process upload.' }, { status: 500 });
  }
}
