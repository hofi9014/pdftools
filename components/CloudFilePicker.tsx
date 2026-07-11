'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

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

function cleanupOAuthUrl() {
  if (window.location.search.includes('oauth=')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('oauth');
    window.history.replaceState(null, '', url.toString());
  }
}

export default function CloudFilePicker({ onFilesPicked, accept = '.pdf', ...props }: CloudFilePickerProps) {
  const { locale } = useLocale();
  const label = props.label ?? t('cloud.add', locale);
  const isOnline = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [offlineMsg, setOfflineMsg] = useState('');
  const googleTokenRef = useRef<string>('');
  const bcRef = useRef<BroadcastChannel | null>(null);
  const oauthIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const handleGoogleDrive = useCallback(async () => {
    setOpen(false);
    if (!navigator.onLine) { setOfflineMsg('offline'); return; }
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
    if (!navigator.onLine) { setOfflineMsg('offline'); return; }
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
    if (!navigator.onLine) { setOfflineMsg('offline'); return; }
    setLoading('onedrive');
    try {
      if (!ONEDRIVE_CLIENT_ID) { throw new Error('OneDrive not configured'); }

      await loadScript('https://js.live.net/v7.2/OneDrive.js', 'onedrive-js');

      // Snapshot all pre-existing OneDrive OAuth keys BEFORE any cleanup, so the
      // interval below can distinguish stale keys (which must be removed but NOT
      // delivered) from fresh keys created by the current OAuth flow. Delivering
      // a stale token to the SDK triggers "Another popup is already opened".
      const preExistingKeys = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('onedrive-oauth-')) {
          preExistingKeys.add(k);
        }
      }

      // Remove stale keys — ONLY removeItem, NO deliverToken.
      for (const k of preExistingKeys) {
        console.log('[OneDrive] Removing stale token key:', k);
        localStorage.removeItem(k);
      }

      // Also clear the OneDrive SDK's own LoginCache hint for this clientId.
      // Stale login hints can cause OAuth to redirect with wrong parameters,
      // leading to silent failures. The SDK stores cache under 'odpickerv7cache'.
      try {
        const sdkCacheRaw = localStorage.getItem('odpickerv7cache');
        if (sdkCacheRaw) {
          const sdkCache = JSON.parse(sdkCacheRaw);
          const hintKey = 'od7-' + ONEDRIVE_CLIENT_ID;
          if (sdkCache.odsdkLoginHint && sdkCache.odsdkLoginHint[hintKey]) {
            console.log('[OneDrive] Cleaning stale SDK login hint:', hintKey,
              JSON.stringify(sdkCache.odsdkLoginHint[hintKey]));
            delete sdkCache.odsdkLoginHint[hintKey];
            localStorage.setItem('odpickerv7cache', JSON.stringify(sdkCache));
          }
        }
      } catch (e) {
        console.warn('[OneDrive] Failed to clean SDK cache:', e);
      }

      // Deduplication set: the same payload can arrive via multiple paths
      // (localStorage interval, BroadcastChannel, window.opener.postMessage).
      // Delivering it more than once gives the SDK a second [OneDriveSDK-OauthResponse]
      // for a completed flow, which triggers "Another popup is already opened".
      const deliveredPayloads = new Set<string>();

      const deliverToken = (payload: string) => {
        if (deliveredPayloads.has(payload)) return;
        deliveredPayloads.add(payload);

        // Defer delivery so the popup's direct window.opener.postMessage (which
        // passes the SDK's e.source === popupWindow check) arrives first. Our
        // same-window postMessage fails that check and would otherwise reject
        // the SDK's OAuth promise with "Another popup is already opened".
        setTimeout(() => {
          window.postMessage(payload, window.location.origin);
        }, 0);

        try {
          const stateMatch = payload.match(/"state":"([^"]+)"/);
          if (stateMatch) {
            const lsKey = 'onedrive-oauth-' + stateMatch[1];
            if (localStorage.getItem(lsKey) !== null) {
              localStorage.removeItem(lsKey);
            }
          }
        } catch { /* ignore */ }
      };

      try {
        bcRef.current = new BroadcastChannel('onedrive-oauth');
        bcRef.current.onmessage = (event) => {
          if (event.data?.type === 'onedrive-token') deliverToken(event.data.payload);
        };
      } catch {}

      oauthIntervalRef.current = setInterval(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('onedrive-oauth-')) {
            const payload = localStorage.getItem(key);
            localStorage.removeItem(key);
            if (payload) {
              // Only deliver keys that appeared AFTER the snapshot (fresh).
              // Stale keys that survived the initial cleanup are removed but
              // NOT delivered — delivering them would confuse the SDK and
              // cause "Another popup is already opened".
              if (preExistingKeys.has(key)) {
                console.log('[OneDrive] Silently removed stale token (not delivered):', key);
              } else {
                deliverToken(payload);
              }
            }
            break;
          }
        }
      }, 300);

      const redirectUri = window.location.origin + '/onedrive-picker-oauth.html';

      window.OneDrive!.open({
        clientId: ONEDRIVE_CLIENT_ID,
        action: 'download',
        multiSelect: true,
        advanced: {
          redirectUri,
          queryParameters: 'select=id,name,content.downloadUrl',
        },
        success: async (files: any) => {
          const fileList: any[] = Array.isArray(files) ? files : (files?.value || []);
          try {
            const result = await Promise.all(
              fileList.map(async (f: any) => {
                const url = f.downloadUrl || f.content?.downloadUrl || f.webUrl || f['@microsoft.graph.downloadUrl'] || '';
                if (!url) { throw new Error('No download URL for ' + f.name); }
                return urlToFile(url, f.name);
              })
            );
            onFilesPicked(result);
          } catch (e) {
            console.error('OneDrive download error:', e);
          }
          setLoading(null);
          cleanupOAuthUrl();
          if (oauthIntervalRef.current) { clearInterval(oauthIntervalRef.current); oauthIntervalRef.current = undefined; }
          if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
        },
        cancel: () => {
          setLoading(null);
          cleanupOAuthUrl();
          if (oauthIntervalRef.current) { clearInterval(oauthIntervalRef.current); oauthIntervalRef.current = undefined; }
          if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
        },
        error: (err: any) => {
          console.error('OneDrive error:', err);
          setLoading(null);
          cleanupOAuthUrl();
          if (oauthIntervalRef.current) { clearInterval(oauthIntervalRef.current); oauthIntervalRef.current = undefined; }
          if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
        },
      });
    } catch (e) {
      console.error('OneDrive error:', e);
      setLoading(null);
      cleanupOAuthUrl();
      if (oauthIntervalRef.current) { clearInterval(oauthIntervalRef.current); oauthIntervalRef.current = undefined; }
      if (bcRef.current) { bcRef.current.close(); bcRef.current = null; }
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

  useEffect(() => {
    if (!offlineMsg) return;
    const t = setTimeout(() => setOfflineMsg(''), 3000);
    return () => clearTimeout(t);
  }, [offlineMsg]);

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
      {offlineMsg && (
        <div className="absolute top-full left-0 mt-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-lg px-3 py-2 shadow-lg z-50 whitespace-nowrap">
          ⚠️ {t('cloud.offline', locale)}
        </div>
      )}
    </div>
  );
}
