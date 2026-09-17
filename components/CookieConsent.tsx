"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { useHydrationSafeLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function CookieConsent() {
  const locale = useHydrationSafeLocale();
  const [show, setShow] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (stored === "accepted") queueMicrotask(() => setGranted(true));
    if (!stored) {
      queueMicrotask(() => setShow(true));
    }
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
    setGranted(true);
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  }, []);

  return (
    <>
      {/* Google Analytics is not loaded at all — not even in a "consent denied" mode — until
          the visitor explicitly accepts. Loading gtag.js unconditionally still contacts
          Google's servers before any choice is made; the only way to guarantee zero
          third-party contact by default is to not load it in the first place. */}
      {granted && (
        <>
          <Script src="https://www.googletagmanager.com/gtag/js?id=G-KN3C22GVP8" strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KN3C22GVP8', { anonymize_ip: true });`}
          </Script>
        </>
      )}
      {show && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--coffee-border)] bg-[var(--coffee-surface-solid)]/95 backdrop-blur-xl p-4 shadow-2xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm leading-relaxed" style={{ color: "var(--coffee-text-secondary)" }}>
              {t('cookie.text', locale)}{" "}
              <Link
                href={`/${locale}/privacy`}
                className="underline hover:no-underline whitespace-nowrap"
                style={{ color: "var(--coffee-accent)" }}
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
