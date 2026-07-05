'use client';
import { useState, useCallback, useRef } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '';
const DROPBOX_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || '';
const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';

interface CloudFilePickerProps {
  onFilesPicked: (files: File[]) => void;
  accept?: string;
  label?: string;
}

function loadScript(src: string, id?: string, attrs?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) { resolve(); return; }
    const s = document.createElement('script');
    if (id) s.id = id;
    s.src = src;
    s.async = true;
    if (attrs) { for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v); }
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function urlToFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'application/pdf' });
}

export default function CloudFilePicker({ onFilesPicked, accept = '.pdf', ...props }: CloudFilePickerProps) {
  const { locale } = useLocale();
  const label = props.label ?? t('cloud.add', locale);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const googleTokenRef = useRef<string>('');

  const handleGoogleDrive = useCallback(async () => {
    setOpen(false);
    setLoading('google');
    try {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) { throw new Error('Google Drive not configured'); }

      await loadScript('https://accounts.google.com/gsi/client', 'google-gsi');
      await loadScript('https://apis.google.com/js/api.js', 'google-api');

      await new Promise<void>((resolve) => {
        gapi.load('picker', { callback: resolve });
      });

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp) => {
          if (resp.error) { throw new Error(resp.error); }
          googleTokenRef.current = resp.access_token;
          const pb = new (gapi.picker.PickerBuilder as any)();
          pb.addView((gapi.picker.ViewId as any).DOCS);
          pb.setOAuthToken(resp.access_token);
          pb.setDeveloperKey(GOOGLE_API_KEY);
          pb.setCallback((data: any) => {
            if (data.action === 'picked' && data.docs) {
              Promise.all(
                data.docs.map(async (doc: any) => {
                  const url = `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`;
                  return urlToFile(url, doc.name);
                })
              ).then(onFilesPicked).catch(() => {});
            }
          });
          pb.build().setVisible(true);
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      console.error('Google Drive error:', e);
      setLoading(null);
    }
  }, [onFilesPicked]);

  const handleDropbox = useCallback(async () => {
    setOpen(false);
    setLoading('dropbox');
    try {
      if (!DROPBOX_KEY) { throw new Error('Dropbox not configured'); }

      await loadScript(`https://www.dropbox.com/static/api/2/dropins.js`, 'dropboxjs', { 'data-app-key': DROPBOX_KEY });

      window.Dropbox!.choose({
        success: async (files: { link: string; name: string }[]) => {
          try {
            const result = await Promise.all(
              files.map((f) => urlToFile(f.link, f.name))
            );
            onFilesPicked(result);
          } catch { }
          setLoading(null);
        },
        cancel: () => setLoading(null),
        linkType: 'direct',
        multiselect: true,
        extensions: accept === '.pdf' ? ['.pdf'] : undefined,
      });
    } catch (e) {
      console.error('Dropbox error:', e);
      setLoading(null);
    }
  }, [onFilesPicked, accept]);

  const handleOneDrive = useCallback(async () => {
    setOpen(false);
    setLoading('onedrive');
    try {
      if (!ONEDRIVE_CLIENT_ID) { throw new Error('OneDrive not configured'); }

      await loadScript('https://js.live.net/v7.2/OneDrive.js', 'onedrive-js');

      window.OneDrive!.open({
        clientId: ONEDRIVE_CLIENT_ID,
        action: 'download',
        multiSelect: true,
        advanced: { queryParameters: 'select=id,name,content.downloadUrl' },
        success: async (files: { name: string; content?: { downloadUrl: string } }[]) => {
          try {
            const result = await Promise.all(
              files.map(async (f) => {
                const url = f.content?.downloadUrl || '';
                if (!url) { throw new Error('No download URL'); }
                return urlToFile(url, f.name);
              })
            );
            onFilesPicked(result);
          } catch { }
          setLoading(null);
        },
        cancel: () => setLoading(null),
      });
    } catch (e) {
      console.error('OneDrive error:', e);
      setLoading(null);
    }
  }, [onFilesPicked]);

  const handleLocal = useCallback(() => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = true;
    input.onchange = (e) => {
      const fls = (e.target as HTMLInputElement).files;
      if (fls) onFilesPicked(Array.from(fls));
    };
    input.click();
  }, [onFilesPicked, accept]);

  const hasGoogle = !!(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);
  const hasDropbox = !!DROPBOX_KEY;
  const hasOneDrive = !!ONEDRIVE_CLIENT_ID;

  const anyConfigured = hasGoogle || hasDropbox || hasOneDrive;

  return (
    <div className="relative inline-block">
      <button
        onClick={anyConfigured ? () => setOpen(!open) : handleLocal}
        disabled={!!loading}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition whitespace-nowrap disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            {loading === 'google' ? 'Google Drive...' : loading === 'dropbox' ? 'Dropbox...' : 'OneDrive...'}
          </span>
        ) : (
          <span>☁️ {label}</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden">
          {hasGoogle && (
            <button onClick={handleGoogleDrive} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <span className="text-lg">📁</span> Google Drive
            </button>
          )}
          {hasDropbox && (
            <button onClick={handleDropbox} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <span className="text-lg">📦</span> Dropbox
            </button>
          )}
          {hasOneDrive && (
            <button onClick={handleOneDrive} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <span className="text-lg">☁️</span> OneDrive
            </button>
          )}
          <button onClick={handleLocal} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3">
            <span className="text-lg">💻</span> {locale === 'pl' ? 'To urządzenie' : 'This device'}
          </button>
        </div>
      )}
    </div>
  );
}
