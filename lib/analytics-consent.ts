// Consent to Google Analytics: stored choice, withdrawing it, and clearing what GA left behind.
//
// GDPR art. 7(3): withdrawing consent must be as easy as giving it. The only way used to be
// "remove the cookie-consent entry from your browser's localStorage", and the _ga cookies GA had
// already set stayed. Now a "Cookie settings" link (footer) reopens the banner, and declining
// stops GA at once and removes its cookies.

export const GA_MEASUREMENT_ID = 'G-KN3C22GVP8';
export const CONSENT_KEY = 'cookie-consent';
/** Window event that reopens the consent banner (dispatched by the footer link). */
export const OPEN_COOKIE_SETTINGS_EVENT = 'optimapdf:cookie-settings';

export type ConsentChoice = 'accepted' | 'declined' | null;

export function readConsent(storage: Pick<Storage, 'getItem'> | undefined): ConsentChoice {
  try {
    const v = storage?.getItem(CONSENT_KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

/** Names of the cookies Google Analytics sets (`_ga`, `_ga_<container>`, and the older `_gid`/`_gat*`). */
export function analyticsCookieNames(cookieHeader: string): string[] {
  return cookieHeader.split(';')
    .map((c) => c.split('=')[0]!.trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid' || n.startsWith('_gat'));
}

/**
 * Cookie strings that expire every GA cookie. GA writes its cookies on the widest domain it can
 * ("auto": `.optimapdf.com`), so each name is expired on the host, on every parent domain and
 * without a domain — a cookie is only removed by the same domain and path it was set with.
 */
export function expireAnalyticsCookies(cookieHeader: string, hostname: string): string[] {
  const parts = hostname.split('.');
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
  const out: string[] = [];
  for (const name of analyticsCookieNames(cookieHeader)) {
    for (const d of domains) out.push(`${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`);
  }
  return out;
}

/** Turns GA off (or back on) in this page without a reload — gtag reads this flag on every hit. */
export function setAnalyticsDisabled(win: Record<string, unknown>, disabled: boolean): void {
  win[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
}
