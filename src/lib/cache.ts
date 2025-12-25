/**
 * In-Memory Cache Utility using node-cache
 * FAANG-level caching for reducing Firebase reads
 */

import NodeCache from "node-cache";

// Campaign cache - 5 minute TTL
export const campaignCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone on get (faster)
});

// Client cache - 5 minute TTL
export const clientCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

// Active campaigns check cache - 1 minute TTL (for early exit checks)
export const activeCheckCache = new NodeCache({
  stdTTL: 60, // 1 minute - shorter for freshness
  checkperiod: 30,
  useClones: false,
});

/**
 * Get or fetch pattern - reduces duplicate reads
 */
export async function getOrFetch<T>(
  cache: NodeCache,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();
  cache.set(key, fresh);
  return fresh;
}

/**
 * Invalidate cache entry
 */
export function invalidate(cache: NodeCache, key: string): void {
  cache.del(key);
}

/**
 * Invalidate all entries matching a pattern
 */
export function invalidatePattern(cache: NodeCache, pattern: string): void {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  });
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  campaignCache.flushAll();
  clientCache.flushAll();
  activeCheckCache.flushAll();
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats() {
  return {
    campaign: campaignCache.getStats(),
    client: clientCache.getStats(),
    activeCheck: activeCheckCache.getStats(),
  };
}
