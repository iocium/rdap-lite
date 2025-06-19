/**
 * Default in-memory cache for RDAP lookups.
 */
import type { RDAPCache } from './types';
import { createCacheKit } from '@iocium/cachekit';

// Default in-memory cache via CacheKit
const kit = createCacheKit();
/**
 * RDAPCache adapter around CacheKit's memory backend.
 * TTL is specified in seconds; ttlSeconds=0 skips caching (immediate expiration).
 */
export const memoryCache: RDAPCache = {
  async get(key: string) {
    return kit.get(key);
  },
  async set(key: string, value: any, ttlSeconds?: number) {
    // zero TTL => no caching
    if (ttlSeconds === 0) return;
    // convert TTL seconds to milliseconds for CacheKit
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : undefined;
    await kit.set(key, value, ttlMs);
  },
};