'use client';
import { useEffect } from 'react';

const SW_URL = '/sw.js';

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then(regs => {
      // Unregister any SW that is NOT ours — cleans up stale registrations
      // from previous experiments or other SWs on the same origin.
      const unregisterOthers = regs
        .filter(r => r.active?.scriptURL !== self.location.origin + SW_URL)
        .map(r => r.unregister());
      return Promise.all(unregisterOthers);
    }).then(() => {
      navigator.serviceWorker.register(SW_URL);
    });
  }, []);
  return null;
}
