import { t } from '@/lib/i18n';
import type { ApiErrorParams } from '@/lib/api-error-codes';

// The API routes and the proxy answer errors as { error: '<Polish text>' }. Shown as is, a
// German or Japanese visitor got a Polish sentence. Each error now also carries a stable `code`
// (and `params` for the numbers in it); the client turns the code into the visitor's language
// and falls back to the server's own text when a code is unknown.
export { API_ERROR_CODES, apiErrorBody, type ApiErrorCode, type ApiErrorParams } from '@/lib/api-error-codes';

export class ApiError extends Error {
  status: number;
  code?: string;
  params?: ApiErrorParams;
  constructor(message: string, status: number, code?: string, params?: ApiErrorParams) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

/**
 * Build the error for a non-OK response. The body is read defensively: a gateway timeout or a
 * platform error page is HTML, and `res.json()` on it used to surface "Unexpected token '<'".
 */
export async function apiErrorFromResponse(res: Response, fallbackMessage: string): Promise<ApiError> {
  let data: { error?: unknown; code?: unknown; params?: unknown } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    data = {};
  }
  const message = typeof data.error === 'string' && data.error ? data.error : fallbackMessage;
  const code = typeof data.code === 'string' ? data.code
    : res.status === 429 ? 'rate_limited' : res.status === 413 ? 'too_large' : undefined;
  const params = data.params && typeof data.params === 'object' ? (data.params as ApiErrorParams) : undefined;
  return new ApiError(message, res.status, code, params);
}

/** `fetch` that reports "no connection" as an ApiError instead of the browser's own English text. */
export async function apiFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError('Brak połączenia z serwerem.', 0, 'network');
  }
}

/** The message to show for anything thrown by an API call, in the visitor's language. */
export function apiErrorText(err: unknown, locale: string): string {
  if (err instanceof ApiError && err.code) {
    const key = `api.err.${err.code}`;
    const text = t(key, locale, err.params);
    if (text !== key) return text;
  }
  if (err instanceof Error && err.message) return err.message;
  return t('error.generic', locale);
}
