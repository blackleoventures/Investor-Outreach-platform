/**
 * Resolves the platform's public base URL for links embedded in outbound email.
 *
 * Getting this wrong is silent and costly: an investor magic link that points at
 * localhost simply never works, and nothing surfaces the failure. Resolution
 * order puts explicit configuration first, then falls back to the URL Vercel
 * injects at build time so a deployment works without extra setup.
 */

/** Values that look configured but aren't. */
function usable(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // The repo ships with this placeholder; treating it as configured would
  // produce links to a domain that doesn't exist.
  if (/example-productionurl\.com/i.test(trimmed)) return null;
  return trimmed;
}

function normalise(value: string): string {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return /^https?:\/\//i.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `https://${withoutTrailingSlash}`;
}

export function appUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";

  const candidate =
    usable(process.env.NEXT_PUBLIC_APP_URL) ||
    (isProduction
      ? usable(process.env.NEXT_PUBLIC_PROD_URL)
      : usable(process.env.NEXT_PUBLIC_DEV_URL)) ||
    usable(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    usable(process.env.VERCEL_URL) ||
    usable(process.env.NEXT_PUBLIC_PROD_URL);

  if (!candidate) {
    if (isProduction) {
      console.warn(
        "[AppUrl] No public URL configured. Set NEXT_PUBLIC_APP_URL - " +
          "email links will point at localhost and will not work."
      );
    }
    return "http://localhost:3000";
  }

  return normalise(candidate);
}
