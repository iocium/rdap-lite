import { isValidDomain, isValidIP, getIPVersion, applyProxy, fetchWithTimeout } from '../src/utils';

describe('utils', () => {
  test('isValidDomain', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('not a domain')).toBe(false);
  });

  test('isValidIP', () => {
    expect(isValidIP('1.1.1.1')).toBe(true);
    expect(isValidIP('2606:4700:4700::1111')).toBe(true);
    expect(isValidIP('invalid-ip')).toBe(false);
  });

  test('getIPVersion', () => {
    expect(getIPVersion('1.1.1.1')).toBe(4);
    expect(getIPVersion('2606:4700:4700::1111')).toBe(6);
    expect(getIPVersion('invalid')).toBe(0);
  });

  test('applyProxy', () => {
    const url = 'https://rdap.example.net/ip/1.1.1.1';
    expect(applyProxy(url)).toBe(url);
    expect(applyProxy(url, 'https://proxy/')).toBe('https://proxy/' + encodeURIComponent(url));
    expect(applyProxy(url, 'https://proxy')).toBe('https://proxy/' + encodeURIComponent(url));
  });

  test('fetchWithTimeout throws on timeout', async () => {
    const start = Date.now();
    await expect(
      fetchWithTimeout('https://example.com', { method: 'GET' }, 1)
    ).rejects.toThrow('The user aborted a request.');
    expect(Date.now() - start).toBeLessThan(100);
  });
  test('fetchWithTimeout returns response when fetch succeeds', async () => {
    const originalFetch = global.fetch;
    const dummyRes = { status: 200, ok: true } as any;
    global.fetch = jest.fn().mockResolvedValue(dummyRes);
    const res = await fetchWithTimeout('https://example.com', { method: 'GET' }, 1000);
    expect(res).toBe(dummyRes);
    global.fetch = originalFetch;
  });
  test('fetchWithTimeout rethrows errors when fetch fails without abort', async () => {
    const originalFetch = global.fetch;
    const error = new Error('Network error');
    global.fetch = jest.fn().mockRejectedValue(error);
    await expect(fetchWithTimeout('https://example.com', {}, 1000)).rejects.toThrow(error);
    global.fetch = originalFetch;
  });
  test('fetchWithTimeout works with default parameters', async () => {
    const originalFetch = global.fetch;
    const dummyRes = { status: 200, ok: true } as any;
    global.fetch = jest.fn().mockResolvedValue(dummyRes);
    const res = await fetchWithTimeout('https://example.com');
    expect(res).toBe(dummyRes);
    global.fetch = originalFetch;
  });
});