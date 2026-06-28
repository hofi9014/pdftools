import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';

const BASE_URL = 'https://api.ilovepdf.com/v1';

function getCredentials() {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const secretKey = process.env.ILOVEPDF_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error('Brak zmiennych środowiskowych ILOVEPDF_PUBLIC_KEY i/lub ILOVEPDF_SECRET_KEY');
  }
  return { publicKey, secretKey };
}

export async function getToken(): Promise<string> {
  const { publicKey, secretKey } = getCredentials();
  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKey, secret_key: secretKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.token;
}

export async function startTask(token: string, tool: string) {
  const res = await fetch(`${BASE_URL}/start/${tool}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Start failed: ${JSON.stringify(data)}`);
  return data;
}

export async function uploadFile(token: string, server: string, taskId: string, filePath: string, fileName: string) {
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const form = new FormData();
  form.append('task', taskId);
  form.append('file', blob, fileName);

  const res = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data.server_filename;
}

export async function processTask(token: string, server: string, taskId: string, tool: string, body: Record<string, unknown>) {
  const res = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task: taskId, tool, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Process failed: ${JSON.stringify(data)}`);
  return data;
}

export async function downloadFile(token: string, server: string, taskId: string): Promise<Buffer> {
  const res = await fetch(`https://${server}/v1/download/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function saveTempFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const tmpPath = join(tmpdir(), `pdf_${Date.now()}_${safeName}`);
  await writeFile(tmpPath, buffer);
  return tmpPath;
}

export async function cleanupTempFiles(paths: string[]) {
  for (const p of paths) {
    await unlink(p).catch(() => {});
  }
}
