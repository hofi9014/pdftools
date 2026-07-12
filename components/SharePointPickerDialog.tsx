'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface GraphSite {
  id: string;
  displayName: string;
  webUrl: string;
}

interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
}

interface GraphItem {
  id: string;
  name: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  size?: number;
  lastModifiedDateTime?: string;
}

interface RecentSite {
  url: string;
  displayName: string;
}

const RECENT_SITES_KEY = 'sharepoint-recent-sites';
const MAX_RECENT_SITES = 5;

function loadRecentSites(): RecentSite[] {
  try {
    const raw = localStorage.getItem(RECENT_SITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSite[];
  } catch { return []; }
}

function saveRecentSite(url: string, displayName: string): void {
  try {
    const sites = loadRecentSites().filter(s => s.url !== url);
    sites.unshift({ url, displayName });
    localStorage.setItem(RECENT_SITES_KEY, JSON.stringify(sites.slice(0, MAX_RECENT_SITES)));
  } catch { /* ignore */ }
}

function removeRecentSite(url: string): void {
  try {
    const sites = loadRecentSites().filter(s => s.url !== url);
    localStorage.setItem(RECENT_SITES_KEY, JSON.stringify(sites));
  } catch { /* ignore */ }
}

interface SharePointPickerDialogProps {
  mode: 'picker' | 'saver';
  open: boolean;
  onClose: () => void;
  onFilesPicked?: (files: File[]) => void;
  onDone?: () => void;
  blob?: Blob;
  fileName?: string;
  clientId: string;
}

type Step = 'auth' | 'sites' | 'libraries' | 'files' | 'uploading' | 'done';

async function graphFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.value as T;
}

async function graphFetchSingle<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${res.statusText}`);
  return await res.json() as T;
}

interface SearchHit { resource: GraphSite }
interface HitsContainer { hits: SearchHit[] }

async function searchSitesViaPost(token: string, query: string): Promise<GraphSite[]> {
  const res = await fetch('https://graph.microsoft.com/v1.0/search/query', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        entityTypes: ['site'],
        query: { queryString: query || '*' },
        fields: ['id', 'name', 'displayName', 'webUrl'],
        from: 0,
        size: 50,
      }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Search API error: ${res.status}${body ? ' - ' + body.slice(0, 200) : ''}`);
  }
  const data = await res.json();
  const results = data.value || [];
  const hits: SearchHit[] = results.length > 0 && results[0].hitsContainers?.length > 0
    ? results[0].hitsContainers[0].hits
    : [];
  return hits.map((h: SearchHit) => h.resource);
}

/** Parse a SharePoint site URL into hostname and server-relative path.
 *  Returns null if the URL is not a valid SharePoint URL. */
function parseSharePointUrl(url: string): { hostname: string; path: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!u.hostname.endsWith('.sharepoint.com') && !u.hostname.endsWith('.sharepoint.cn')
    && !u.hostname.endsWith('.sharepoint.de') && !u.hostname.endsWith('.sharepoint.us')
    && u.hostname !== 'sharepoint.com') {
    return null;
  }
  return { hostname: u.hostname, path: u.pathname.replace(/\/+$/, '') || '/' };
}

/** Fetch a SharePoint site directly by hostname + path using
 *  GET /v1.0/sites/{hostname}:/{path}
 *  This endpoint does NOT depend on the Search Platform and works
 *  with standard Sites.Read.All delegated permissions. */
async function fetchSiteByUrl(token: string, hostname: string, path: string): Promise<GraphSite> {
  const encodedHost = encodeURIComponent(hostname);
  const encodedPath = path === '/' ? '' : ':' + encodeURIComponent(path);
  return await graphFetchSingle<GraphSite>(
    `https://graph.microsoft.com/v1.0/sites/${encodedHost}${encodedPath}`,
    token
  );
}

export default function SharePointPickerDialog({
  mode, open, onClose, onFilesPicked, onDone, blob, fileName, clientId,
}: SharePointPickerDialogProps) {
  const [step, setStep] = useState<Step>('auth');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [sites, setSites] = useState<GraphSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<GraphSite | null>(null);
  const [libraries, setLibraries] = useState<GraphDrive[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<GraphDrive | null>(null);
  const [files, setFiles] = useState<GraphItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, GraphItem>>(new Map());
  const [currentPath, setCurrentPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [connectingViaUrl, setConnectingViaUrl] = useState(false);
  const [recentSites, setRecentSites] = useState<RecentSite[]>([]);
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const closePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    popupRef.current = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = undefined; }
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) {
      closePopup();
      return;
    }
    setStep('auth');
    setError('');
    setToken('');
    setSites([]);
    setSelectedSite(null);
    setLibraries([]);
    setSelectedLibrary(null);
    setFiles([]);
    setSelectedFiles(new Map());
    setCurrentPath('');
    setSearchQuery('');
    setSiteUrl('');
    setConnectingViaUrl(false);
    setShowManualOptions(false);
    setRecentSites(loadRecentSites());
  }, [open, closePopup]);

  // Start OAuth flow
  const startOAuth = useCallback(() => {
    setError('');
    const scopes = mode === 'picker'
      ? 'Sites.Read.All Files.Read.All offline_access'
      : 'Sites.ReadWrite.All offline_access';
    const redirectUri = window.location.origin + '/sharepoint-oauth.html';
    const authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
      + '?client_id=' + encodeURIComponent(clientId)
      + '&response_type=token'
      + '&redirect_uri=' + encodeURIComponent(redirectUri)
      + '&scope=' + encodeURIComponent(scopes)
      + '&prompt=select_account';

    closePopup();

    const popup = window.open(authUrl, 'sharepoint-login', 'width=600,height=700');
    if (!popup) { setError('Popup blocked. Please allow popups for this site.'); return; }
    popupRef.current = popup;

    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'sharepoint-token' && e.data.accessToken) {
        window.removeEventListener('message', handler);
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = undefined; }
        if (mountedRef.current) {
          setToken(e.data.accessToken);
          setStep('sites');
        }
      }
    };
    window.addEventListener('message', handler);

    intervalRef.current = setInterval(() => {
      if (popup.closed) {
        clearInterval(intervalRef.current!);
        intervalRef.current = undefined;
        window.removeEventListener('message', handler);
        if (mountedRef.current && step === 'auth') {
          setError('Login cancelled or window closed');
        }
      }
    }, 500);
  }, [clientId, mode, closePopup, step]);

  // Auto-start OAuth when dialog opens and step is auth
  useEffect(() => {
    if (open && step === 'auth' && !token) {
      startOAuth();
    }
  }, [open, step, token, startOAuth]);

  // Search sites — POST Search API for wildcard, GET for typed queries
  const searchSites = useCallback(async () => {
    if (!token) return;
    setSearching(true);
    setError('');
    try {
      const q = searchQuery.trim();
      let data: GraphSite[];
      if (!q) {
        // Use POST Search API for the wildcard "all sites" query — the GET
        // ?search=* returns 400 on many tenants because the search parameter
        // requires a real text query (not a wildcard). The POST /search/query
        // endpoint properly handles the * wildcard as "match everything".
        data = await searchSitesViaPost(token, '*');
      } else {
        // Specific text queries work fine with GET
        data = await graphFetch<GraphSite[]>(
          `https://graph.microsoft.com/v1.0/sites?search=${encodeURIComponent(q)}`, token
        );
      }
      if (mountedRef.current) setSites(data);
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to search sites');
      }
    } finally {
      if (mountedRef.current) setSearching(false);
    }
  }, [token, searchQuery]);

  // Auto-search when sites step becomes active with a valid token
  useEffect(() => {
    if (step === 'sites' && token && !searching && sites.length === 0) {
      (async () => {
        setSearching(true);
        setError('');
        try {
          const data = await searchSitesViaPost(token, '*');
          if (mountedRef.current) setSites(data);
        } catch (e) {
          if (mountedRef.current) {
            setError(e instanceof Error ? e.message : 'Failed to search sites');
          }
        } finally {
          if (mountedRef.current) setSearching(false);
        }
      })();
    }
  }, [step, token]);

  // Select site → load libraries
  const handleSelectSite = useCallback(async (site: GraphSite) => {
    if (!token) return;
    setSelectedSite(site);
    setLoadingLibraries(true);
    setError('');
    try {
      const data = await graphFetch<GraphDrive[]>(
        `https://graph.microsoft.com/v1.0/sites/${site.id}/drives`, token
      );
      if (mountedRef.current) {
        setLibraries(data);
        setStep('libraries');
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to load libraries');
    } finally {
      if (mountedRef.current) setLoadingLibraries(false);
    }
  }, [token]);

  // Connect via direct URL — bypasses the Search Platform entirely
  const handleConnectViaUrl = useCallback(async () => {
    if (!token || !siteUrl.trim()) return;
    setConnectingViaUrl(true);
    setError('');
    try {
      const parsed = parseSharePointUrl(siteUrl.trim());
      if (!parsed) {
        throw new Error('Invalid SharePoint URL. Expected something like https://tenant.sharepoint.com/sites/name');
      }
      const site = await fetchSiteByUrl(token, parsed.hostname, parsed.path);
      saveRecentSite(siteUrl.trim(), site.displayName);
      if (mountedRef.current) {
        handleSelectSite(site);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to connect to site');
      }
    } finally {
      if (mountedRef.current) setConnectingViaUrl(false);
    }
  }, [token, siteUrl, handleSelectSite]);

  const handleConnectViaUrlWithUrl = useCallback(async (url: string) => {
    if (!token) return;
    setConnectingViaUrl(true);
    setError('');
    try {
      const parsed = parseSharePointUrl(url);
      if (!parsed) {
        throw new Error('Invalid SharePoint URL');
      }
      const site = await fetchSiteByUrl(token, parsed.hostname, parsed.path);
      saveRecentSite(url, site.displayName);
      if (mountedRef.current) {
        handleSelectSite(site);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to connect to site');
        setSiteUrl(url);
      }
    } finally {
      if (mountedRef.current) setConnectingViaUrl(false);
    }
  }, [token, handleSelectSite]);

  // Select library → load files (picker mode) or upload (saver mode)
  const handleSelectLibrary = useCallback(async (drive: GraphDrive) => {
    if (!token) return;
    setSelectedLibrary(drive);
    setCurrentPath('');
    if (mode === 'saver') {
      // Upload directly
      setStep('uploading');
      try {
        const url = `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodeURIComponent(fileName || 'document.pdf')}:/content`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob?.type || 'application/pdf' },
          body: blob,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        if (mountedRef.current) setStep('done');
        onDone?.();
      } catch (e) {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : 'Upload failed');
          setStep('libraries');
        }
      }
      return;
    }
    // Picker mode: load files
    setLoadingFiles(true);
    setError('');
    try {
      const data = await graphFetch<GraphItem[]>(
        `https://graph.microsoft.com/v1.0/drives/${drive.id}/root/children?$top=50`, token
      );
      if (mountedRef.current) {
        setFiles(data);
        setStep('files');
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to load files');
    } finally {
      if (mountedRef.current) setLoadingFiles(false);
    }
  }, [token, mode, fileName, blob, onDone]);

  // Navigate into folder
  const navigateFolder = useCallback(async (item: GraphItem) => {
    if (!token || !selectedLibrary) return;
    setLoadingFiles(true);
    setError('');
    try {
      const folderPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      const data = await graphFetch<GraphItem[]>(
        `https://graph.microsoft.com/v1.0/drives/${selectedLibrary.id}/root:/${encodeURIComponent(folderPath)}:/children?$top=50`, token
      );
      if (mountedRef.current) {
        setFiles(data);
        setCurrentPath(folderPath);
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to open folder');
    } finally {
      if (mountedRef.current) setLoadingFiles(false);
    }
  }, [token, selectedLibrary, currentPath]);

  // Navigate up
  const navigateUp = useCallback(async () => {
    if (!token || !selectedLibrary || !currentPath) return;
    setLoadingFiles(true);
    setError('');
    try {
      const parts = currentPath.split('/');
      parts.pop();
      const parentPath = parts.join('/');
      const data = await graphFetch<GraphItem[]>(
        parentPath
          ? `https://graph.microsoft.com/v1.0/drives/${selectedLibrary.id}/root:/${encodeURIComponent(parentPath)}:/children?$top=50`
          : `https://graph.microsoft.com/v1.0/drives/${selectedLibrary.id}/root/children?$top=50`,
        token
      );
      if (mountedRef.current) {
        setFiles(data);
        setCurrentPath(parentPath);
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Failed to navigate');
    } finally {
      if (mountedRef.current) setLoadingFiles(false);
    }
  }, [token, selectedLibrary, currentPath]);

  // Toggle file selection
  const toggleFile = useCallback((item: GraphItem) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }, []);

  // Download selected files
  const downloadFiles = useCallback(async () => {
    if (!token || selectedFiles.size === 0) return;
    setStep('uploading');
    setError('');
    try {
      const results: File[] = [];
      for (const item of selectedFiles.values()) {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/drives/${selectedLibrary!.id}/items/${item.id}/content`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Failed to download ${item.name}`);
        const blob = await res.blob();
        results.push(new File([blob], item.name, { type: blob.type || 'application/octet-stream' }));
      }
      if (mountedRef.current) {
        setStep('done');
        onFilesPicked?.(results);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Download failed');
        setStep('files');
      }
    }
  }, [token, selectedFiles, selectedLibrary, onFilesPicked]);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'picker' ? 'SharePoint — Pick files' : 'SharePoint — Save file'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
              {(error.includes('blocked') || error.includes('cancelled')) && (
                <button onClick={startOAuth} className="ml-2 underline font-medium">Try again</button>
              )}
            </div>
          )}

          {/* Auth step */}
          {step === 'auth' && !error && (
            <div className="flex items-center justify-center py-8">
              <span className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Signing in to Microsoft...</span>
            </div>
          )}

          {/* Sites step */}
          {step === 'sites' && (
            <div className="space-y-4">
              {/* Recent sites chips — shortcuts above the list */}
              {recentSites.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recentSites.map((site) => (
                    <div
                      key={site.url}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800 group"
                    >
                      <button
                        onClick={() => { setSiteUrl(site.url); handleConnectViaUrlWithUrl(site.url); }}
                        className="flex items-center gap-1 truncate max-w-[220px]"
                        title={site.url}
                      >
                        <span>🏢</span>
                        <span className="truncate">{site.displayName}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeRecentSite(site.url); setRecentSites(loadRecentSites()); }}
                        className="text-blue-400 hover:text-red-500 transition flex-shrink-0 ml-1 opacity-0 group-hover:opacity-100"
                        title="Usuń"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading state (auto-search) */}
              {searching && sites.length === 0 && (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                  Wyszukiwanie dostępnych witryn...
                </div>
              )}

              {/* Site list (auto-populated) */}
              {!searching && error && sites.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Wyszukiwanie nie powiodło się.{' '}
                  <button onClick={() => setShowManualOptions(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
                    Wklej link ręcznie
                  </button>
                </p>
              )}

              {sites.length > 0 && (
                <>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Wybierz witrynę SharePoint:
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {sites.map((site) => (
                      <button
                        key={site.id}
                        onClick={() => handleSelectSite(site)}
                        className="w-full text-left px-4 py-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition shadow-sm hover:shadow"
                      >
                        <span className="text-2xl flex-shrink-0">🏢</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{site.displayName}</div>
                          {site.webUrl && <div className="text-xs text-gray-400 truncate mt-0.5">{site.webUrl}</div>}
                        </div>
                        <span className="text-gray-300 dark:text-gray-600 text-lg">&rarr;</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Empty results after search completed */}
              {!searching && sites.length === 0 && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nie znaleziono żadnych witryn.
                </p>
              )}

              {/* Manual options toggle */}
              <div className="text-center">
                <button
                  onClick={() => setShowManualOptions(!showManualOptions)}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  {showManualOptions ? '▲ Schowaj opcje ręczne' : '▼ Nie widzisz swojej witryny? Wklej link ręcznie'}
                </button>
              </div>

              {/* Expandable manual options */}
              {showManualOptions && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  {/* URL connect */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Wklej adres URL witryny SharePoint
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !connectingViaUrl) handleConnectViaUrl(); }}
                        placeholder="https://tenant.sharepoint.com/sites/nazwa"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleConnectViaUrl}
                        disabled={connectingViaUrl || !siteUrl.trim()}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        {connectingViaUrl ? (
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* Search by name */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchSites(); }}
                      placeholder="Search SharePoint sites by name..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={searchSites}
                      disabled={searching}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {searching ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : 'Search'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Możesz też wyszukać witrynę po nazwie.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Libraries step */}
          {step === 'libraries' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <button onClick={() => { setSelectedSite(null); setStep('sites'); }} className="text-blue-600 dark:text-blue-400 hover:underline">
                  &larr; Back
                </button>
                <span>/</span>
                <span className="truncate">{selectedSite?.displayName}</span>
              </div>
              {loadingLibraries ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                  Loading libraries...
                </div>
              ) : libraries.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No document libraries found.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {libraries.map((drive) => (
                    <button
                      key={drive.id}
                      onClick={() => handleSelectLibrary(drive)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition"
                    >
                      <span className="text-lg">📂</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{drive.name}</div>
                        <div className="text-xs text-gray-400">{drive.driveType}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files step (picker mode only) */}
          {step === 'files' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <button onClick={() => { setSelectedLibrary(null); setStep('libraries'); }} className="text-blue-600 dark:text-blue-400 hover:underline">
                  &larr; Back
                </button>
                <span>/</span>
                <span className="truncate">{selectedSite?.displayName}</span>
                <span>/</span>
                <span className="truncate">{selectedLibrary?.name}</span>
              </div>
              {currentPath && (
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={navigateUp} className="text-blue-600 dark:text-blue-400 hover:underline">&larr; ..</button>
                  <span className="text-gray-500 truncate">{currentPath}</span>
                </div>
              )}
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                  Loading files...
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">This library is empty.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {files.map((item) => {
                    const isFolder = !!item.folder;
                    const selected = selectedFiles.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                        onClick={() => isFolder ? navigateFolder(item) : toggleFile(item)}
                      >
                        <span className="text-lg flex-shrink-0">{isFolder ? '📁' : '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-gray-700 dark:text-gray-300">{item.name}</div>
                          {!isFolder && (
                            <div className="text-xs text-gray-400">
                              {formatSize(item.size)}{item.lastModifiedDateTime ? ` · ${formatDate(item.lastModifiedDateTime)}` : ''}
                            </div>
                          )}
                        </div>
                        {!isFolder && (
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleFile(item)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Uploading / Done step */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {mode === 'picker' ? 'Downloading files...' : 'Uploading file...'}
              </span>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="text-3xl">✅</span>
              <span className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                {mode === 'picker' ? 'Files downloaded successfully!' : 'File saved successfully!'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          {step === 'files' && (
            <button
              onClick={downloadFiles}
              disabled={selectedFiles.size === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition disabled:cursor-not-allowed"
            >
              Download {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
