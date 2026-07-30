import { appUrl } from './app-url';

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser
    return window.location.origin;
  }

  // Server: shares one resolver with outbound email, so tracking URLs and
  // magic links can never disagree about where the app lives.
  return appUrl();
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}
