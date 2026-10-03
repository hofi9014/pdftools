// Stable error codes shared by the API routes, the proxy and the client. Kept free of any
// import (in particular lib/i18n, 15k lines of translations) so the server bundles that only
// need to STAMP a code on a response stay small; the client-side mapping to the visitor's
// language lives in lib/api-error.ts.
export const API_ERROR_CODES = [
  'rate_limited', 'too_large', 'forbidden', 'network', 'ai_unavailable', 'ai_daily_limit',
  'invalid_request', 'url_invalid', 'url_blocked', 'url_unresolved', 'url_redirect', 'url_failed',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export type ApiErrorParams = Record<string, string | number>;

/** The JSON body of an error response: the Polish text stays for logs and old clients. */
export function apiErrorBody(code: ApiErrorCode, error: string, params?: ApiErrorParams): { error: string; code: ApiErrorCode; params?: ApiErrorParams } {
  return params ? { error, code, params } : { error, code };
}
