'use client';
import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Unregister ALL service workers to clear stale caches
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
    // Do NOT re-register — prevents SW cache poisoning after updates
  }, []);
  return null;
}
