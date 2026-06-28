'use client';
import { useState, useEffect, useCallback } from 'react';

export interface UserSettings {
  preferredLanguage: 'pl' | 'en';
  preferredTheme: 'light' | 'dark' | 'system';
  lastUsedTools: string[];
  autoDownload: boolean;
}

const defaults: UserSettings = {
  preferredLanguage: 'pl',
  preferredTheme: 'system',
  lastUsedTools: [],
  autoDownload: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pdfsettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({ ...defaults, ...parsed });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem('pdfsettings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const trackToolUsage = useCallback((toolPath: string) => {
    setSettings(prev => {
      const tools = [toolPath, ...prev.lastUsedTools.filter(t => t !== toolPath)].slice(0, 10);
      const next = { ...prev, lastUsedTools: tools };
      try { localStorage.setItem('pdfsettings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { settings, loaded, update, trackToolUsage };
}
