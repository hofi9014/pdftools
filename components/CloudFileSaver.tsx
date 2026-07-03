'use client';
import { useState, useCallback, useRef } from 'react';
import { useLocale } from '@/lib/locale-context';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '';
const DROPBOX_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';

interface CloudFileSaverProps {
  blob: Blob;
  fileName: string;
  onDone?: () => void;
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getGoogleToken(): Promise<string> {
  await loadScript('https://accounts.google.com/gsi/client', 'google-gsi');
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });
}

export default function CloudFileSaver({ blob, fileName, onDone }: CloudFileSaverProps) {
  const { locale } = useLocale();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const googleTokenRef = useRef<string>('');

  const saveToGoogleDrive = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) { setError('Google Drive not configured'); return; }
    setSaving('google');
    setError('');
    try {
      let token = googleTokenRef.current;
      if (!token) {
        token = await getGoogleToken();
        googleTokenRef.current = token;
      }

      const metadata = JSON.stringify({ name: fileName, mimeType: blob.type || 'application/pdf' });
      const formData = new FormData();
      formData.append('metadata', new Blob([metadata], { type: 'application/json' }));
      formData.append('media', blob, fileName);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      setSaving(null);
      onDone?.();
    } catch (e) {
      googleTokenRef.current = '';
      setError(e instanceof Error ? e.message : 'Google Drive save failed');
      setSaving(null);
    }
  }, [blob, fileName, onDone]);

  const saveToDropbox = useCallback(async () => {
    if (!DROPBOX_KEY) { setError('Dropbox not configured'); return; }
    setSaving('dropbox');
    setError('');
    try {
      await loadScript('https://www.dropbox.com/static/api/2/dropins.js', 'dropboxjs');

      const formData = new FormData();
      formData.append('file', blob, fileName);
      const res = await fetch('/api/exports', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Failed to get export link');
      const { url } = await res.json();

      window.Dropbox!.save(
        window.location.origin + url,
        fileName,
        {
          success: () => { setSaving(null); onDone?.(); },
          cancel: () => { setSaving(null); },
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dropbox save failed');
      setSaving(null);
    }
  }, [blob, fileName, onDone]);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
        {locale === 'pl' ? 'Zapisz do:' : 'Save to:'}
      </span>

      {!!GOOGLE_CLIENT_ID && (
        <button
          onClick={saveToGoogleDrive}
          disabled={!!saving}
          className="text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 flex items-center gap-1.5"
          style={{ color: 'var(--coffee-text-secondary)', borderColor: 'var(--coffee-border)' }}
        >
          {saving === 'google' ? (
            <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📁</span>
          )}
          Google Drive
        </button>
      )}

      {!!DROPBOX_KEY && (
        <button
          onClick={saveToDropbox}
          disabled={!!saving}
          className="text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 flex items-center gap-1.5"
          style={{ color: 'var(--coffee-text-secondary)', borderColor: 'var(--coffee-border)' }}
        >
          {saving === 'dropbox' ? (
            <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📦</span>
          )}
          Dropbox
        </button>
      )}

      {error && <p className="text-xs text-red-500 ml-2">⚠️ {error}</p>}
    </div>
  );
}
