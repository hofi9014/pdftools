'use client';
import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

export default function InstallBanner() {
  const { locale } = useLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setInstalled(true);
      return;
    }
    if (localStorage.getItem('optimapdf_install_dismissed')) {
      setDismissed(true);
      return;
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
      setIsIOS(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setInstalled(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('optimapdf_install_dismissed', '1');
  };

  if (installed || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="rounded-2xl border p-5 flex items-start gap-4" style={{
        backgroundColor: 'var(--coffee-badge-bg)',
        borderColor: 'var(--coffee-border)',
      }}>
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
          backgroundColor: 'var(--coffee-accent)',
          color: '#fff',
        }}>
          ⬇
        </div>
        <div className="flex-1 min-w-0">
          {deferredPrompt ? (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--coffee-text)' }}>
                {t('install.title', locale)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--coffee-text-secondary)' }}>
                {t('install.desc', locale)}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button onClick={handleInstall} className="btn-accent text-xs px-4 py-1.5">
                  {t('install.button', locale)}
                </button>
                <button onClick={handleDismiss} className="btn-ghost text-xs px-3 py-1.5">
                  {t('install.dismiss', locale)}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm" style={{ color: 'var(--coffee-text)' }}>
                {t('install.ios', locale)}
              </p>
              <div className="flex gap-2 mt-2.5">
                <button onClick={handleDismiss} className="btn-ghost text-xs px-3 py-1.5">
                  {t('install.dismiss', locale)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
