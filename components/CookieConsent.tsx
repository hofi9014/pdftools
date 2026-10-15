"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { extractLocaleFromPath } from "@/components/LayoutShell";
import { useHydrationSafeLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import {
  CONSENT_KEY,
  GA_MEASUREMENT_ID,
  OPEN_COOKIE_SETTINGS_EVENT,
  expireAnalyticsCookies,
  readConsent,
  setAnalyticsDisabled,
} from "@/lib/analytics-consent";

export default function CookieConsent() {
  // The banner asks for consent, so it speaks the language of the page being read (the URL's
  // locale), not a preference stored on an earlier visit.
  const pathname = usePathname();
  const storedLocale = useHydrationSafeLocale();
  const locale = extractLocaleFromPath(pathname ?? '') ?? storedLocale;
  const [show, setShow] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const stored = readConsent(window.localStorage);
    if (stored === "accepted") queueMicrotask(() => setGranted(true));
    if (!stored) queueMicrotask(() => setShow(true));
    // "Cookie settings" in the footer reopens the banner, so consent can be withdrawn (or given)
    // as easily as it was answered the first time.
    const reopen = () => setShow(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const accept = useCallback(() => {
    try { localStorage.setItem(CONSENT_KEY, "accepted"); } catch { /* the choice holds for this visit */ }
    setAnalyticsDisabled(window as unknown as Record<string, unknown>, false);
    setShow(false);
    setGranted(true);
  }, []);

  const decline = useCallback(() => {
    try { localStorage.setItem(CONSENT_KEY, "declined"); } catch { /* the choice holds for this visit */ }
    // Withdrawn after GA had already loaded: stop it in this page at once and remove the
    // identifier cookies it set, instead of waiting for the next visit.
    setAnalyticsDisabled(window as unknown as Record<string, unknown>, true);
    for (const c of expireAnalyticsCookies(document.cookie, window.location.hostname)) document.cookie = c;
    setShow(false);
    setGranted(false);
  }, []);

  return (
    <>
      {/* Google Analytics is not loaded at all — not even in a "consent denied" mode — until
          the visitor explicitly accepts. Loading gtag.js unconditionally still contacts
          Google's servers before any choice is made; the only way to guarantee zero
          third-party contact by default is to not load it in the first place. */}
      {granted && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}
      {show && (
        <div
          role="region"
          aria-label={t('cookie.settings', locale)}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--coffee-border)] bg-[var(--coffee-surface-solid)]/95 backdrop-blur-xl p-4 shadow-2xl"
        >
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--coffee-text-secondary)" }}>
              {t('cookie.text', locale)}{" "}
              <Link
                href={`/${locale}/privacy`}
                className="underline hover:no-underline whitespace-nowrap"
                style={{ color: "var(--coffee-accent-ink)" }}
              >
                {t('cookie.privacy_link', locale)}
              </Link>
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={decline}
                className="px-5 py-2 rounded-lg text-sm font-medium transition border"
                style={{
                  color: "var(--coffee-text-secondary)",
                  borderColor: "var(--coffee-border)",
                }}
              >
                {t('cookie.decline', locale)}
              </button>
              <button
                onClick={accept}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white transition shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--coffee-accent), var(--coffee-gold))",
                }}
              >
                {t('cookie.accept', locale)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
