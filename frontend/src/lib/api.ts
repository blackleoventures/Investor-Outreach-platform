export const getApiBase = () => {
  const envBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    // Fallback to same-origin rewrites (Next.js rewrite to /api/*)
    return '';
  }
  return 'http://localhost:5000';
};

export const apiFetch = async (path: string, init?: RequestInit) => {
  const base = getApiBase();
  const url = base ? `${base}${path.startsWith('/') ? '' : '/'}${path}` : path;
  const res = await fetch(url, init);
  return res;
};

