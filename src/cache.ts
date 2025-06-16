/**
 * Default in-memory cache for RDAP lookups.
 */
import { RDAPCache } from './types';

const store = new Map<string, { value: any; expires: number }>();

export const memoryCache: RDAPCache = {
  async get(key: string) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expires) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  },
  async set(key: string, value: any, ttlSeconds = 86400) {
    store.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  },
};