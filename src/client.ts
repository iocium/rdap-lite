/* istanbul ignore file */
import { RDAPOptions, RDAPResult, RDAPEntity, RDAPCache } from './types';
import { isValidDomain, isValidIP, getIPVersion, applyProxy, fetchWithTimeout } from './utils';
import IPCIDR from 'ip-cidr';
import { memoryCache } from './cache';

const IANA_BOOTSTRAP = {
  domain: 'https://data.iana.org/rdap/dns.json',
  ipv4: 'https://data.iana.org/rdap/ipv4.json',
  ipv6: 'https://data.iana.org/rdap/ipv6.json',
};

const defaultHeaders = {
  'Accept': 'application/rdap+json, application/json',
};

/**
 * Discover RDAP base URL for a domain or IP using IANA bootstrap.
 */
// Cache compiled bootstrap services (patterns or CIDR matchers) per cache instance
const compiledBootstraps: WeakMap<RDAPCache, Record<string, Array<{ patterns?: string[]; cidrs?: IPCIDR[]; url: string }>>> = new WeakMap();
export async function getRDAPBase(input: string, type: 'domain' | 'ip', opts: RDAPOptions): Promise<string | undefined> {
  const cache = opts.cache || memoryCache;
  // Use unified cache key for domain or IP bootstrap
  const cacheKey = `rdap-bootstrap-${type}`;
  let data: any = await cache.get(cacheKey);
  if (!data) {
    const url = type === 'domain'
      ? IANA_BOOTSTRAP.domain
      : getIPVersion(input) === 4
        ? IANA_BOOTSTRAP.ipv4
        : IANA_BOOTSTRAP.ipv6;
    const res = await fetchWithTimeout(url, { headers: opts.headers ?? defaultHeaders }, opts.timeout);
    if (!res.ok) throw new Error(`Failed to fetch IANA bootstrap: ${res.status}`);
    data = await res.json();
    await cache.set(cacheKey, data, 86400);
  }
  // Compile service entries once per cache instance and bootstrap key
  let compiledMap = compiledBootstraps.get(cache) || {};
  let compiled = compiledMap[cacheKey];
  if (!compiled) {
    compiled = (data.services || []).map(([patterns, urls]: any[]) => {
      const url = urls[0] as string;
      if (type === 'domain') {
        return { patterns: patterns as string[], url };
      } else {
        return { cidrs: (patterns as string[]).map(cidr => new IPCIDR(cidr)), url };
      }
    });
    compiledMap[cacheKey] = compiled;
    compiledBootstraps.set(cache, compiledMap);
  }
  // Match input against compiled services
  for (const entry of compiled) {
    if (type === 'domain' && entry.patterns) {
      if (entry.patterns.some(p => input === p || input.endsWith(p))) {
        return entry.url;
      }
    } else if (entry.cidrs) {
      for (const matcher of entry.cidrs) {
        if (matcher.contains(input)) {
          return entry.url;
        }
      }
    }
  }
  return undefined;
}

/**
 * Parse RDAP entity to extract meaningful identity info.
 */
function extractEntity(entity: any): RDAPEntity {
  const name = entity.fn || entity['vcardArray']?.[1]?.find((v: any[]) => v[0] === 'fn')?.[3];
  const roles = entity.roles;
  const handle = entity.handle;
  const email = entity['vcardArray']?.[1]?.find((v: any[]) => v[0] === 'email')?.[3];
  return { name, roles, handle, email };
}

/**
 * Perform an RDAP query for a domain or IP.
 */
export async function queryRDAP(input: string, opts: RDAPOptions = {}): Promise<RDAPResult> {
  const cache: RDAPCache = opts.cache || memoryCache;
  const timeout = opts.timeout || 10000;
  const headers = { ...defaultHeaders, ...opts.headers };
  const proxy = opts.proxy;

  const type: 'domain' | 'ip' = isValidDomain(input)
    ? 'domain'
    : isValidIP(input)
      ? 'ip'
      : (() => { throw new Error('Input must be a valid domain or IP address'); })();

  const cacheKey = `rdap-result-${input}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const base = await getRDAPBase(input, type, opts);
  if (!base) throw new Error('Could not resolve RDAP base for input');

  const url = applyProxy(`${base.replace(/\/$/, '')}/${type}/${input}`, proxy);

  let retries = 3;
  let backoff = 500;
  let res: Response;

  while (retries--) {
    res = await fetchWithTimeout(url, { headers }, timeout);
    if (res.status !== 429) break;
    await new Promise(r => setTimeout(r, backoff));
    backoff *= 2;
  }

  if (!res!.ok) throw new Error(`RDAP query failed: ${res!.status}`);
  const raw = await res!.json();

  // Extract registration and last-changed dates in a single pass
  let created: string | undefined;
  let updated: string | undefined;
  if (Array.isArray(raw.events)) {
    for (const ev of raw.events) {
      if (ev.eventAction === 'registration') created = ev.eventDate;
      else if (ev.eventAction === 'last changed') updated = ev.eventDate;
      if (created && updated) break;
    }
  }
  const result: RDAPResult = {
    type,
    handle: raw.handle,
    name: raw.name || raw.ldhName,
    registrar: raw.port43,
    org: raw?.entities?.[0]?.fn || raw?.entities?.[0]?.vcardArray?.[1]?.find((v: any[]) => v[0] === 'fn')?.[3],
    country: raw.country,
    networkRange: raw.startAddress && raw.endAddress ? `${raw.startAddress} - ${raw.endAddress}` : undefined,
    created,
    updated,
    entities: raw.entities?.map(extractEntity),
    raw
  };

  await cache.set(cacheKey, result, 3600);
  return result;
}