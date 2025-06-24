/**
 * Represents a normalized RDAP entity (e.g., contact or organization).
 */
export interface RDAPEntity {
  handle?: string;
  name?: string;
  email?: string;
  country?: string;
  roles?: string[];
}

/**
 * The final normalized result returned by RDAP lookups.
 */
export interface RDAPResult {
  /** Type of RDAP resource: domain name, IP address, or ASN (autnum) */
  type: 'domain' | 'ip' | 'autnum';
  handle?: string;
  name?: string;
  registrar?: string;
  org?: string;
  country?: string;
  networkRange?: string;
  created?: string;
  updated?: string;
  raw?: any;
  entities?: RDAPEntity[];
}

/**
 * Configuration options for RDAP lookups.
 */
export interface RDAPOptions {
  /** Optional proxy base URL to prepend to all RDAP requests (useful for CORS) */
  proxy?: string;
  /** Custom headers to use in RDAP and bootstrap requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Optional cache interface implementation */
  cache?: RDAPCache;
  /**
   * If true, use build-time embedded IANA bootstrap data
   * (requires running the update-bootstraps tool before build).
   */
  staticBootstrap?: boolean;
}

/**
 * Interface for pluggable cache systems.
 */
export interface RDAPCache {
  get: (key: string) => Promise<any | undefined>;
  set: (key: string, value: any, ttlSeconds?: number) => Promise<void>;
}