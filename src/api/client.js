/**
 * Central HTTP client.
 *
 * Every request in the app goes through `apiRequest`, so these concerns live in ONE place:
 *  - base URL
 *  - JSON headers
 *  - attaching the Bearer token
 *  - turning non-2xx responses into a typed `ApiError`
 *  - reacting to 401 (token missing / expired / revoked) by logging the user out
 */

export const BASE_URL =
  import.meta.env.VITE_API_URL || 'https://testapi.mtm-company.com/api';

const TOKEN_KEY = 'support_desk_token';

// localStorage can throw (private mode, blocked storage) – never let that crash the app.
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Error thrown for any failed request. `status` is 0 for network failures. */
export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Laravel 422 shape: { field: ["message", ...] }
    this.errors = errors;
  }
}

// The AuthProvider registers a callback here, so the client can trigger a logout
// without importing React code (keeps the client framework-agnostic).
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function apiRequest(path, { method = 'GET', body, params, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Request was cancelled on purpose (component unmounted / filters changed) – let callers ignore it.
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error');
  }

  // 204 No Content (e.g. DELETE)
  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null; // non-JSON body (e.g. an HTML error page from a proxy)
    }
  }

  if (!response.ok) {
    // Only treat 401 as "session expired" when we actually sent a token.
    if (response.status === 401 && token && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(
      response.status,
      data?.message || response.statusText || 'Request failed',
      data?.errors || {},
    );
  }

  return data;
}
