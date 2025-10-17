export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser
    return window.location.origin;
  }
  
  // Server
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_DEV_URL || 'http://localhost:3000';
  }
  
  return process.env.NEXT_PUBLIC_PROD_URL || process.env.VERCEL_URL || 'https://yourdomain.com';
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}
