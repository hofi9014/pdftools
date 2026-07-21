"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useHydrationSafeLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, string>) => void;
    dataLayer: unknown[];
  }
}

function updateConsent(status: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("consent", "update", { analytics_storage: status });
  }
}

export default function CookieConsent() {
  const locale = useHydrationSafeLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (stored === "accepted") {
      updateConsent("granted");
    }
    if (!stored) {
      queueMicrotask(() => setShow(true));
    }
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
    updateConsent("granted");
  }, []);

  const decline = useCallback(() => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
    updateConsent("denied");
  }, []);

  if (show !== true) return null;

  return (
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
  );
}
