'use client';
import { useState, useEffect } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

let _deferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

const points = [
  { icon: '📶', key: 'point1' },
  { icon: '⚡', key: 'point2' },
  { icon: '📌', key: 'point3' },
];

export default function InstallSection() {
  const locale = useHydrationSafeLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(_deferredPrompt);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as NavigatorStandalone).standalone) {
      setInstalled(true);
      return;
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)) {
      setIsIOS(true);
    }
    if (!deferredPrompt && _deferredPrompt) {
      setDeferredPrompt(_deferredPrompt);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
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

  if (installed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <div className="rounded-2xl p-8 md:p-10" style={{
        backgroundColor: 'color-mix(in srgb, var(--coffee-accent) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--coffee-accent) 20%, transparent)',
      }}>
        <h3 className="text-2xl font-bold mb-8 text-center" style={{ color: 'var(--coffee-text)' }}>
          {t('installSection.title', locale)}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {points.map(p => (
            <div key={p.key} className="flex items-start gap-3 p-4 rounded-xl" style={{
              backgroundColor: 'var(--coffee-surface-solid)',
              border: '1px solid var(--coffee-border)',
            }}>
              <span className="text-2xl shrink-0">{p.icon}</span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
                {t(`installSection.${p.key}`, locale)}
              </p>
            </div>
          ))}
        </div>

        {deferredPrompt ? (
          <div className="text-center">
            <button onClick={handleInstall} className="btn-accent text-base px-8 py-3">
              {t('installSection.button', locale)}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--coffee-text-secondary)' }}>
              {t('install.ios', locale)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
