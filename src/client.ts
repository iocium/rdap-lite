/* istanbul ignore file */
import { RDAPOptions, RDAPResult, RDAPEntity, RDAPCache } from './types';
import { isValidDomain, isValidIP, getIPVersion, applyProxy, fetchWithTimeout } from './utils';
import * as ipaddr from 'ipaddr.js';
import { memoryCache } from './cache';
// Build-time embedded IANA bootstrap data (run `update-bootstraps` to refresh):
import dnsBootstrap from './data/dns.json';
import ipv4Bootstrap from './data/ipv4.json';
import ipv6Bootstrap from './data/ipv6.json';
import autnumBootstrap from './data/asn.json';

const IANA_BOOTSTRAP = {
  domain: 'https://data.iana.org/rdap/dns.json',
  ipv4: 'https://data.iana.org/rdap/ipv4.json',
  ipv6: 'https://data.iana.org/rdap/ipv6.json',
  autnum: 'https://data.iana.org/rdap/asn.json',
};

const defaultHeaders = {
  'Accept': 'application/rdap+json, application/json',
};

/**
 * Discover RDAP base URL for a domain or IP using IANA bootstrap.
 */
// Cache compiled bootstrap services (domain patterns or IP networks) per cache instance
type BootstrapEntry = {
  url: string;
  // for domain lookup
  patterns?: string[];
  // for IP lookup: parsed CIDR ranges
  networks?: Array<{ range: any; bits: number }>; // use any for ipaddr range
  ranges?: Array<{ low: number; high: number }>;
};
const compiledBootstraps: WeakMap<RDAPCache, Record<string, BootstrapEntry[]>> = new WeakMap();
export async function getRDAPBase(input: string, type: 'domain' | 'ip' | 'autnum', opts: RDAPOptions): Promise<string | undefined> {
  const cache = opts.cache || memoryCache;
  const cacheKey = `rdap-bootstrap-${type}`;
  const useStatic = opts.staticBootstrap === true;
  // Load bootstrap data: embedded JSON or cached network fetch
  let data: any;
  if (useStatic) {
    if (type === 'domain') {
      data = dnsBootstrap;
    } else if (type === 'autnum') {
      data = autnumBootstrap;
    } else {
      data = getIPVersion(input) === 4 ? ipv4Bootstrap : ipv6Bootstrap;
    }
  } else {
    // Cached network fetch path
    data = await cache.get(cacheKey);
    if (!data) {
      let url: string;
      if (type === 'domain') {
        url = IANA_BOOTSTRAP.domain;
      } else if (type === 'autnum') {
        url = IANA_BOOTSTRAP.autnum;
      } else {
        url = getIPVersion(input) === 4 ? IANA_BOOTSTRAP.ipv4 : IANA_BOOTSTRAP.ipv6;
      }
      const res = await fetchWithTimeout(url, { headers: opts.headers ?? defaultHeaders }, opts.timeout);
      if (!res.ok) throw new Error(`Failed to fetch IANA bootstrap: ${res.status}`);
      data = await res.json();
      await cache.set(cacheKey, data, 86400);
    }
  }
  // Compile service entries once per cache instance and bootstrap key
  const compiledMap = compiledBootstraps.get(cache) || {};
  let compiled = compiledMap[cacheKey];
  if (!compiled) {
    // Pre-compile patterns for domain, IP, or ASN
    compiled = (data.services || []).map(([patterns, urls]: any[]) => {
      const url = urls[0] as string;
      if (type === 'domain') {
        return { url, patterns: patterns as string[] };
      } else if (type === 'autnum') {
        const networks: Array<{ range: any; bits: number }> = [];
        const ranges: Array<{ low: number; high: number }> = [];
        for (const p of patterns as string[]) {
          const s = p as string;
          if (s.includes('/')) {
            try {
              const [range, bits] = ipaddr.parseCIDR(s);
              networks.push({ range, bits });
            } catch {
              // skip invalid CIDR
            }
          } else {
            const parts = s.split('-', 2);
            const low = parseInt(parts[0], 10);
            const high = parts[1] !== undefined ? parseInt(parts[1], 10) : low;
            if (!isNaN(low) && !isNaN(high)) {
              ranges.push({ low, high });
            }
          }
        }
        return { url, networks, ranges };
      } else {
        const networks: Array<{ range: any; bits: number }> = [];
        for (const cidr of patterns as string[]) {
          try {
            const [range, bits] = ipaddr.parseCIDR(cidr);
            networks.push({ range, bits });
          } catch {
            // skip invalid CIDR
          }
        }
        return { url, networks };
      }
    });
    compiledMap[cacheKey] = compiled;
    compiledBootstraps.set(cache, compiledMap);
  }
  // Match input against compiled services
  if (type === 'domain') {
    for (const entry of compiled) {
      if (entry.patterns?.some(p => input === p || input.endsWith(p))) {
        return entry.url;
      }
    }
  } else if (type === 'ip') {
    const addr = ipaddr.parse(input);
    for (const entry of compiled) {
      for (const net of entry.networks || []) {
        if (addr.kind() === net.range.kind() && addr.match(net.range, net.bits)) {
          return entry.url;
        }
      }
    }
  } else if (type === 'autnum') {
    const asn = parseInt(input, 10);
    for (const entry of compiled) {
      for (const r of entry.ranges || []) {
        if (asn >= r.low && asn <= r.high) {
          return entry.url;
        }
      }
      // fallback to network matching (e.g., stub patterns with CIDR)
      const addr = ipaddr.parse(input);
      for (const net of entry.networks || []) {
        if (addr.kind() === net.range.kind() && addr.match(net.range, net.bits)) {
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
  // Treat plain numeric input as ASN by prefixing 'AS' for consistent matching
  input = input.replace(/^(\d+)$/, 'AS$1');
  const cache: RDAPCache = opts.cache || memoryCache;
  const timeout = opts.timeout || 10000;
  const headers = { ...defaultHeaders, ...opts.headers };
  const proxy = opts.proxy;

  // Determine query type: domain, IP, or ASN (autnum)
  let type: 'domain' | 'ip' | 'autnum';
  let target = input;
  // Match ASNs with optional 'AS' prefix or plain digits
  const asnMatch = /^(?:AS)?(\d+)$/i.exec(input);
  if (asnMatch) {
    type = 'autnum';
    target = asnMatch[1];
  } else if (isValidDomain(input)) {
    type = 'domain';
  } else if (isValidIP(input)) {
    type = 'ip';
  } else {
    throw new Error('Input must be a valid domain, IP address, or ASN');
  }

  const cacheKey = `rdap-result-${target}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const base = await getRDAPBase(target, type, opts);
  if (!base) throw new Error('Could not resolve RDAP base for input');

  const url = applyProxy(`${base.replace(/\/$/, '')}/${type}/${target}`, proxy);

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

  // Compute network or ASN range
  let networkRange: string | undefined;
  if (type === 'ip' && raw.startAddress && raw.endAddress) {
    networkRange = `${raw.startAddress} - ${raw.endAddress}`;
  } else if (type === 'autnum' && raw.startAutnum != null && raw.endAutnum != null) {
    networkRange = `${raw.startAutnum} - ${raw.endAutnum}`;
  }

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
    networkRange,
    created,
    updated,
    entities: raw.entities?.map(extractEntity),
    raw
  };

  await cache.set(cacheKey, result, 3600);
  return result;
}