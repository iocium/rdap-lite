import * as utils from '../src/utils';
import * as client from '../src/client';

const { getRDAPBase, queryRDAP } = client;

describe('getRDAPBase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches bootstrap for domain and returns first matching URL', async () => {
    const dummyData = {
      services: [
        [['example.com'], ['https://rdap1.example/']],
        [['.com'], ['https://rdap2.com/']],
      ],
    };
    const fetchMock = jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const base = await getRDAPBase('example.com', 'domain', { cache: dummyCache });
    expect(base).toBe('https://rdap1.example/');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-bootstrap-domain', dummyData, 86400);
  });

  test('uses cache when available', async () => {
    const cachedData = { services: [] };
    const dummyCache = {
      get: jest.fn().mockResolvedValue(cachedData),
      set: jest.fn(),
    };
    const base = await getRDAPBase('anything', 'domain', { cache: dummyCache });
    expect(base).toBeUndefined();
    expect(dummyCache.get).toHaveBeenCalledWith('rdap-bootstrap-domain');
    expect(dummyCache.set).not.toHaveBeenCalled();
  });

  test('fetches bootstrap for IPv4 and returns matching URL', async () => {
    const dummyData = {
      services: [[['192.168.0.0/24'], ['https://rdap.local/']]],
    };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const input = '192.168.0.5';
    const base = await getRDAPBase(input, 'ip', { cache: dummyCache });
    expect(base).toBe('https://rdap.local/');
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-bootstrap-ip', dummyData, 86400);
  });

  test('fetches bootstrap for IPv6 and returns matching URL', async () => {
    const dummyData = {
      services: [[['2001:db8::/32'], ['https://rdap6.local/']]],
    };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const input = '2001:db8::1';
    const base = await getRDAPBase(input, 'ip', { cache: dummyCache });
    expect(base).toBe('https://rdap6.local/');
  });
  test('throws when bootstrap fetch fails', async () => {
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({ ok: false, status: 500 } as any);
    await expect(
      getRDAPBase('example.com', 'domain', { cache: dummyCache })
    ).rejects.toThrow('Failed to fetch IANA bootstrap: 500');
  });
  test('returns undefined when no patterns match', async () => {
    const dummyData = { services: [[['nomatch'], ['https://nope/']]] };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const base = await getRDAPBase('example.com', 'domain', { cache: dummyCache });
    expect(base).toBeUndefined();
  });
  test('returns URL when domain endsWith pattern', async () => {
    const dummyData = { services: [[['.com'], ['https://endswith/']]] };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const base = await getRDAPBase('test.com', 'domain', { cache: dummyCache });
    expect(base).toBe('https://endswith/');
  });
  test('uses default memoryCache when opts.cache not provided', async () => {
    const dummyData = { services: [[['foobar.com'], ['https://rdap.foobar/']]] };
    const fetchMock = jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const base1 = await getRDAPBase('foobar.com', 'domain', {} as any);
    const base2 = await getRDAPBase('foobar.com', 'domain', {} as any);
    expect(base1).toBe('https://rdap.foobar/');
    expect(base2).toBe('https://rdap.foobar/');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('fetches bootstrap for autnum and returns matching URL from ranges', async () => {
    const dummyData = {
      services: [[['1-2', 'invalid'], ['https://rdap-range/']]],
    };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dummyData,
    } as any);
    const dummyCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const base1 = await getRDAPBase('1', 'autnum', { cache: dummyCache });
    expect(base1).toBe('https://rdap-range/');
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-bootstrap-autnum', dummyData, 86400);
    const base2 = await getRDAPBase('2', 'autnum', { cache: dummyCache });
    expect(base2).toBe('https://rdap-range/');
  });
  
  test('uses static bootstrap data when staticBootstrap is true', async () => {
    const dummyCache = {} as any;
    const base = await getRDAPBase('example.com', 'domain', { staticBootstrap: true, cache: dummyCache });
    expect(base).toBeUndefined();
  });
});

describe('queryRDAP', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('throws on invalid input', async () => {
    await expect(queryRDAP('notvalid')).rejects.toThrow(
      'Input must be a valid domain, IP address, or ASN'
    );
  });

  test('returns cached result without fetching', async () => {
    const dummyResult = { foo: 'bar' };
    const dummyCache = {
      get: jest.fn().mockResolvedValue(dummyResult),
      set: jest.fn(),
    };
    const result = await queryRDAP('example.com', { cache: dummyCache });
    expect(result).toBe(dummyResult);
    expect(dummyCache.get).toHaveBeenCalledWith('rdap-result-example.com');
    expect(dummyCache.set).not.toHaveBeenCalled();
  });
  test('throws when RDAP base cannot be resolved', async () => {
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    jest.spyOn(utils, 'fetchWithTimeout').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ services: [] }),
    } as any);
    await expect(
      queryRDAP('example.com', { cache: dummyCache })
    ).rejects.toThrow('Could not resolve RDAP base for input');
  });
  test('performs RDAP query and caches result', async () => {
    const rawData = {
      handle: 'h', name: 'n', port43: 'p', country: 'c',
      startAddress: '1.1.1.1', endAddress: '1.1.1.2',
      events: [
        { eventAction: 'registration', eventDate: '2020-01-01' },
        { eventAction: 'last changed', eventDate: '2021-01-01' },
      ],
      entities: [
        { handle: 'ent1', fn: 'fn1', roles: ['role1'], vcardArray: [[], [['email', {}, 'text', 'e1@test']]] },
        { handle: 'ent2', vcardArray: [[], [['fn', {}, 'text', 'fn2'], ['email', {}, 'text', 'e2@test']]], roles: ['role2'] },
      ],
    };
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    // stub fetch for bootstrap and query stages
    const fetchSpy = jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ services: [[['192.0.2.0/24'], ['https://rdap.test/']]] }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => rawData } as any;
    });
    const originalSetTimeout = global.setTimeout;
    // @ts-ignore: override timer for immediate retry
    (global as any).setTimeout = (fn: any) => { fn(); return 0 as any; };
    const result = await queryRDAP('192.0.2.1', { cache: dummyCache, proxy: 'http://proxy', headers: { 'X-Test': 'Y' }, timeout: 500 });
    // @ts-ignore: restore original timer
    (global as any).setTimeout = originalSetTimeout;
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://proxy/https%3A%2F%2Frdap.test%2Fip%2F192.0.2.1'),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Test': 'Y' }) }),
      500
    );
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-result-192.0.2.1', result, 3600);
    expect(result).toMatchObject({
      type: 'ip', handle: 'h', name: 'n', registrar: 'p', org: 'fn1', country: 'c',
      networkRange: '1.1.1.1 - 1.1.1.2', created: '2020-01-01', updated: '2021-01-01',
    });
    expect(result.entities).toHaveLength(2);
    expect(result.entities![1].name).toBe('fn2');
  });
  test('retries on 429 status code', async () => {
    const rawData = { handle: 'h', name: 'n', port43: '', country: '', events: [], entities: [] };
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    let callCount = 0;
    // stub fetch for bootstrap (always succeed) and query (retry on first 429)
    jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ services: [[['example.com'], ['https://rdap.retry/']]] }),
        } as any;
      }
      callCount++;
      if (callCount === 1) return { status: 429 } as any;
      return { ok: true, status: 200, json: async () => rawData } as any;
    });
    const originalSetTimeout = global.setTimeout;
    // @ts-ignore: override timer for retry backoff
    (global as any).setTimeout = (fn: any) => { fn(); return 0 as any; };
    const result = await queryRDAP('example.com', { cache: dummyCache });
    // @ts-ignore: restore original timer
    (global as any).setTimeout = originalSetTimeout;
    expect(callCount).toBe(2);
    expect(result.handle).toBe('h');
  });
  test('throws when RDAP query returns non-ok status', async () => {
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    // stub bootstrap fetch to return a domain base
    jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ services: [[['example.com'], ['https://rdap.fail/']]] }),
        } as any;
      }
      // simulate query failure
      return { ok: false, status: 500 } as any;
    });
    await expect(queryRDAP('example.com', { cache: dummyCache })).rejects.toThrow('RDAP query failed: 500');
  });
  test('performs RDAP domain query and handles raw.ldhName', async () => {
    const rawData = {
      handle: 'h', ldhName: 'ldh', port43: 'p', country: 'c',
      // no start/end addresses
      events: [], entities: [],
    };
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ services: [[['example.com'], ['https://rdap.domain/']]] }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => rawData } as any;
    });
    const result = await queryRDAP('example.com', { cache: dummyCache });
    expect(result).toMatchObject({
      type: 'domain', handle: 'h', name: 'ldh', registrar: 'p', org: undefined, country: 'c',
      networkRange: undefined, created: undefined, updated: undefined,
    });
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-result-example.com', result, 3600);
  });
  });
  test('extracts org from vcardArray when fn missing', async () => {
    const rawData = {
      handle: 'h', name: 'n', port43: 'p', country: 'c',
      startAddress: '1.1.1.1', endAddress: '1.1.1.2',
      events: [], entities: [
        { handle: 'entX', vcardArray: [[], [['fn', {}, 'text', 'fnX']]] },
      ],
    };
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ services: [[['1.1.1.1/32'], ['https://rdap.test/']]] }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => rawData } as any;
    });
    const result = await queryRDAP('1.1.1.1', { cache: dummyCache });
    expect(result.org).toBe('fnX');
    expect(result.entities).toHaveLength(1);
    expect(result.entities![0].name).toBe('fnX');
  });

// Tests for static bootstrap and ASN queries
describe('getRDAPBase staticBootstrap', () => {
  test('uses static bootstrap data when staticBootstrap is true for domain', async () => {
    const dummyCache = {} as any;
    const base = await getRDAPBase('example.com', 'domain', { staticBootstrap: true, cache: dummyCache });
    expect(base).toBeUndefined();
  });
  test('uses static bootstrap data when staticBootstrap is true for IP', async () => {
    const dummyCache = {} as any;
    const base = await getRDAPBase('1.2.3.4', 'ip', { staticBootstrap: true, cache: dummyCache });
    expect(base).toBeUndefined();
  });
  test('uses static bootstrap data when staticBootstrap is true for autnum', async () => {
    const dummyCache = {} as any;
    const base = await getRDAPBase('123', 'autnum', { staticBootstrap: true, cache: dummyCache });
    expect(base).toBeUndefined();
  });
});

describe('queryRDAP autnum', () => {
  test('performs RDAP ASN (autnum) query and caches result', async () => {
    const rawData = {
      handle: 'h', name: 'n', port43: 'p', country: 'c',
      startAutnum: 100, endAutnum: 200, events: [], entities: [],
    };
    const dummyCache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
    const fetchSpy = jest.spyOn(utils, 'fetchWithTimeout').mockImplementation(async (url: string) => {
      if (url.includes('data.iana.org/rdap')) {
        return {
          ok: true, status: 200,
          json: async () => ({ services: [[['0/0'], ['https://rdap.autnum/']]] }),
        } as any;
      }
      return { ok: true, status: 200, json: async () => rawData } as any;
    });
    const originalSetTimeout = global.setTimeout;
    (global as any).setTimeout = (fn: any) => { fn(); return 0 as any; };
    const result = await queryRDAP('AS123', { cache: dummyCache });
    (global as any).setTimeout = originalSetTimeout;
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/autnum/123'),
      expect.anything(),
      expect.any(Number),
    );
    expect(result.type).toBe('autnum');
    expect(result.networkRange).toBe('100 - 200');
    expect(dummyCache.set).toHaveBeenCalledWith('rdap-result-123', result, 3600);
  });
});