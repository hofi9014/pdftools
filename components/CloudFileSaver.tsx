'use client';
import { useState, useCallback, useRef } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '';
const DROPBOX_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';
const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';
const GOOGLE_TOKEN_CACHE_KEY = 'optimapdf_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'optimapdf_google_expires_at';

interface CloudFileSaverProps {
  blob: Blob;
  fileName: string;
  onDone?: () => void;
}

function loadScript(src: string, id: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    if (attrs) { for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v); }
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getMicrosoftToken(clientId: string): Promise<string> {
  const redirectUri = window.location.origin + '/onedrive-oauth.html';
  const scopes = 'Files.ReadWrite.All offline_access';
  const authUrl = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&response_type=token'
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=' + encodeURIComponent(scopes)
    + '&prompt=select_account';

  const popup = window.open(authUrl, 'onedrive-login', 'width=600,height=700');
  if (!popup) throw new Error('Popup blocked');

  return new Promise<string>((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'onedrive-token') {
        window.removeEventListener('message', handler);
        resolve(e.data.accessToken);
      }
    };
    window.addEventListener('message', handler);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', handler);
        reject(new Error('Login cancelled'));
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(timer);
      window.removeEventListener('message', handler);
      popup.close();
      reject(new Error('Login timeout'));
    }, 120000);
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
        try {
          sessionStorage.setItem(GOOGLE_TOKEN_CACHE_KEY, resp.access_token);
          const expiresIn = (resp as { expires_in?: number }).expires_in;
          if (expiresIn) {
            sessionStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, String(Date.now() + (expiresIn - 300) * 1000));
          }
        } catch { /* sessionStorage unavailable */ }
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });
}

export default function CloudFileSaver({ blob, fileName, onDone }: CloudFileSaverProps) {
  const { locale } = useLocale();
  const isOnline = useOnlineStatus();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const googleTokenRef = useRef<string>('');

  const saveToGoogleDrive = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) { setError('Google Drive not configured'); return; }
    if (!navigator.onLine) { setError('__offline__'); return; }
    setSaving('google');
    setError('');
    try {
      let token = googleTokenRef.current;
      if (!token) {
        try {
          const cached = sessionStorage.getItem(GOOGLE_TOKEN_CACHE_KEY);
          const expiry = sessionStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
          if (cached && expiry && Date.now() < Number(expiry)) {
            token = cached;
            googleTokenRef.current = token;
          }
        } catch { /* ignore */ }
      }
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
      try {
        sessionStorage.removeItem(GOOGLE_TOKEN_CACHE_KEY);
        sessionStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
      } catch { /* ignore */ }
      setError(e instanceof Error ? e.message : 'Google Drive save failed');
      setSaving(null);
    }
  }, [blob, fileName, onDone]);

  const saveToOneDrive = useCallback(async () => {
    if (!ONEDRIVE_CLIENT_ID) { setError('OneDrive not configured'); return; }
    if (!navigator.onLine) { setError('__offline__'); return; }
    setSaving('onedrive');
    setError('');
    try {
      const token = await getMicrosoftToken(ONEDRIVE_CLIENT_ID);
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(fileName)}:/content`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type || 'application/pdf' },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      setSaving(null);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OneDrive save failed');
      setSaving(null);
    }
  }, [blob, fileName, onDone]);

  const saveToDropbox = useCallback(async () => {
    if (!DROPBOX_KEY) { setError('Dropbox not configured'); return; }
    if (!navigator.onLine) { setError('__offline__'); return; }
    setSaving('dropbox');
    setError('');
    try {
      await loadScript('https://www.dropbox.com/static/api/2/dropins.js', 'dropboxjs', { 'data-app-key': DROPBOX_KEY });

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

      {!!ONEDRIVE_CLIENT_ID && (
        <button
          onClick={saveToOneDrive}
          disabled={!!saving}
          className="text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 flex items-center gap-1.5"
          style={{ color: 'var(--coffee-text-secondary)', borderColor: 'var(--coffee-border)' }}
        >
          {saving === 'onedrive' ? (
            <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>☁️</span>
          )}
          OneDrive
        </button>
      )}

      {error && <p className="text-xs text-red-500 ml-2">⚠️ {error === '__offline__' ? t('cloud.offline', locale) : error}</p>}
    </div>
  );
}
