import type { RDAPCache } from './types';
import { createCacheKit, KVBackend, D1Backend, type CacheKit } from '@iocium/cachekit';

/**
 * Wraps a CacheKit instance into the RDAPCache interface.
 */
function toRDAPCache(kit: CacheKit): RDAPCache {
  return {
    async get(key: string) {
      return kit.get(key);
    },
    async set(key: string, value: any, ttlSeconds?: number) {
      if (ttlSeconds === 0) return;
      const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : undefined;
      await kit.set(key, value, ttlMs);
    },
  };
}

// Default in-memory cache via CacheKit
export const memoryCache: RDAPCache = toRDAPCache(createCacheKit());

// KV namespace cache for Workers (pass KV binding)
export function kvCache(namespace: any): RDAPCache {
  const kit = createCacheKit({ backend: new KVBackend(namespace) });
  return toRDAPCache(kit);
}

// D1 database cache for Workers (pass D1 binding)
export function d1Cache(db: any): RDAPCache {
  const kit = createCacheKit({ backend: new D1Backend(db) });
  return toRDAPCache(kit);
}