// Client HTTP pentru API-ul SchoolHop (token JWT în localStorage)

const TOKEN_KEY = 'schoolhop.token';

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* stocare indisponibilă (mod privat) */ }
}

export const auth = {
  get token() { return storageGet(TOKEN_KEY); },
  set token(value) { storageSet(TOKEN_KEY, value); },
  get isLoggedIn() { return Boolean(storageGet(TOKEN_KEY)); },
  logout() {
    storageSet(TOKEN_KEY, null);
    window.location.href = 'login.html';
  },
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Nu ne-am putut conecta la server. Verifică conexiunea la internet.');
  }

  if (res.status === 401 && token) {
    storageSet(TOKEN_KEY, null);
    const next = encodeURIComponent(window.location.pathname.replace(/^\//, '') + window.location.search);
    window.location.href = `login.html?next=${next}`;
    throw new ApiError(401, 'Sesiunea a expirat');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || `Eroare ${res.status}`, data && data.details);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

let metaPromise = null;
export function getMeta() {
  if (!metaPromise) metaPromise = api.get('/meta');
  return metaPromise;
}
