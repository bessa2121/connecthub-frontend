const TOKEN_KEY = 'connecthub.token';
const BASE = (window.__CONNECTHUB__?.API_URL ?? '').replace(/\/$/, '');

// Cache em memória das respostas GET: evita repetir chamadas ao navegar e
// reaproveita requisições já em andamento (a API gratuita pode demorar a acordar).
const TTL = { default: 30_000, meta: 600_000 };
const cache = new Map();

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    cache.clear();
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    cache.clear();
  },
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, body) {
  const token = tokenStore.get();
  let response;

  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.', 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data?.error ?? 'Algo deu errado.', response.status, data?.details);
  return data;
}

function get(path, ttl = TTL.default) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;

  const promise = request('GET', path);
  cache.set(path, { at: Date.now(), promise });
  promise.catch(() => cache.delete(path));
  return promise;
}

// Qualquer escrita invalida o cache (curtidas, projetos e perfil mudam as listas).
async function send(method, path, body) {
  const result = await request(method, path, body);
  cache.clear();
  return result;
}

const query = (filters) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return params.size ? `?${params}` : '';
};

export const api = {
  meta: () => get('/meta', TTL.meta),
  me: () => request('GET', '/auth/me'),
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),

  projects: (filters = {}) => get(`/projects${query(filters)}`),
  project: (slug) => get(`/projects/${slug}`),
  publish: (body) => send('POST', '/projects', body),
  removeProject: (slug) => send('DELETE', `/projects/${slug}`),
  like: (slug) => send('POST', `/projects/${slug}/like`),

  members: (filters = {}) => get(`/members${query(filters)}`),
  member: (slug) => get(`/members/${slug}`),
  updateProfile: (body) => send('PUT', '/profile', body),
};
