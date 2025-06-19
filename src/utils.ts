/**
 * Utility helpers for RDAP validation and networking.
 */
import isIP from 'validator/lib/isIP';
import isFQDN from 'validator/lib/isFQDN';

/**
 * Returns true if input is a valid IP address.
 */
export function isValidIP(input: string): boolean {
  return !!isIP(input);
}

/**
 * Returns true if input is a valid domain name (FQDN).
 */
export function isValidDomain(input: string): boolean {
  return isFQDN(input, { require_tld: true, allow_underscores: false });
}

/**
 * Returns IP version (4 for IPv4, 6 for IPv6, 0 if not an IP).
 */
export function getIPVersion(input: string): 0 | 4 | 6 {
  if (isIP(input, 4)) {
    return 4;
  }
  if (isIP(input, 6)) {
    return 6;
  }
  return 0;
}

/**
 * Applies optional proxy URL to a target URL.
 */
export function applyProxy(url: string, proxy?: string): string {
  if (!proxy) return url;
  return proxy.endsWith('/') ? proxy + encodeURIComponent(url) : proxy + '/' + encodeURIComponent(url);
}

/**
 * Creates a timeout wrapper for fetch requests.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  // Immediate abort for very small timeouts
  if (timeoutMs <= 1) {
    controller.abort();
  } else {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new Error('The user aborted a request.');
    }
    throw err;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}