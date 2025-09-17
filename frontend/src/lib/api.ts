// Runtime backend auto-detection with in-memory and sessionStorage caching
let resolvedApiBase: string | null = null;

const candidateBases: string[] = [
  // Environment variable first
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL
    ? process.env.NEXT_PUBLIC_BACKEND_URL
    : '',
  // Local development
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  // Production fallback - will be set via environment
  typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? ''
    : process.env.NEXT_PUBLIC_BACKEND_URL || '',
];

const probeHealthcheck = async (base: string, timeoutMs = 800): Promise<boolean> => {
  if (!base) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${base}/api/healthcheck`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
};

export const getApiBase = async (forceRescan: boolean = false): Promise<string> => {
  if (!forceRescan && resolvedApiBase) return resolvedApiBase;

  // Read cached selection (browser only)
  if (typeof window !== 'undefined') {
    const cached = forceRescan ? null : sessionStorage.getItem('apiBase');
    if (cached) {
      resolvedApiBase = cached;
      return resolvedApiBase;
    }
  }

  // Try candidates in order
  for (const base of candidateBases) {
    // Skip duplicates
    if (!base || (resolvedApiBase && base === resolvedApiBase)) continue;
    const ok = await probeHealthcheck(base);
    if (ok) {
      resolvedApiBase = base;
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem('apiBase', resolvedApiBase); } catch {}
      }
      return resolvedApiBase;
    }
  }

  // Fallback based on environment
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    // Production environment - use relative path or environment variable
    resolvedApiBase = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
  } else {
    // Development environment
    resolvedApiBase = 'http://localhost:5000';
  }
  return resolvedApiBase;
};

export const apiFetch = async (path: string, init?: RequestInit) => {
  const buildUrl = (base: string) => {
    if (!base) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  };

  // Force localhost for development
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    const url = buildUrl('http://localhost:5000');
    return fetch(url, init);
  }

  // First attempt with current/base
  let base = await getApiBase();
  let url = buildUrl(base);
  try {
    return await fetch(url, init);
  } catch (err) {
    // On network failure, clear cache and rescan, then retry once
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem('apiBase'); } catch {}
    }
    resolvedApiBase = null;
    base = await getApiBase(true);
    url = buildUrl(base);
    return fetch(url, init);
  }
};

