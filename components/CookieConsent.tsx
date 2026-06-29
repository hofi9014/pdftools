"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      setShow(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
    if (typeof window !== "undefined" && "gtag" in window) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Ta strona używa Google Analytics do analizy ruchu.
          Korzystając ze strony, zgadzasz się na to.
        </p>
        <button
          onClick={accept}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}
