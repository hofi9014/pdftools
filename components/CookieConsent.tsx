"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useHydrationSafeLocale } from "@/lib/locale-context";

declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, string>) => void;
    dataLayer: unknown[];
  }
}

const content: Record<string, { text: string; accept: string; decline: string }> = {
  pl: {
    text: "Ta strona używa Google Analytics do anonimowej analizy ruchu. Możesz zaakceptować lub odrzucić przetwarzanie danych analitycznych.",
    accept: "Akceptuję",
    decline: "Odrzucam",
  },
  en: {
    text: "This site uses Google Analytics for anonymous traffic analysis. You can accept or reject analytics data processing.",
    accept: "Accept",
    decline: "Decline",
  },
};

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
  const lang = locale === "pl" ? content.pl : content.en;

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
          {lang.text}{" "}
          <Link
            href={locale === "pl" ? "/privacy" : "/en/privacy"}
            className="underline hover:no-underline whitespace-nowrap"
            style={{ color: "var(--coffee-accent)" }}
          >
            {locale === "pl" ? "Polityka prywatności" : "Privacy Policy"}
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
            {lang.decline}
          </button>
          <button
            onClick={accept}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--coffee-accent), var(--coffee-gold))",
            }}
          >
            {lang.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
