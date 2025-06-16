import * as index from '../src/index';
import * as client from '../src/client';
import * as cache from '../src/cache';
import * as utils from '../src/utils';

describe('index exports', () => {
  test('re-exports client functions', () => {
    expect(index.getRDAPBase).toBe(client.getRDAPBase);
    expect(index.queryRDAP).toBe(client.queryRDAP);
  });

  test('re-exports cache', () => {
    expect(index.memoryCache).toBe(cache.memoryCache);
  });

  test('re-exports utility functions', () => {
    expect(index.isValidIP).toBe(utils.isValidIP);
    expect(index.isValidDomain).toBe(utils.isValidDomain);
    expect(index.getIPVersion).toBe(utils.getIPVersion);
    expect(index.applyProxy).toBe(utils.applyProxy);
    expect(index.fetchWithTimeout).toBe(utils.fetchWithTimeout);
  });
});