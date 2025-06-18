import * as utils from '../src/utils';
import { getRDAPBase } from '../src/client';

describe('getRDAPBase with staticBootstrap', () => {
  let fetchSpy: jest.SpyInstance;
  beforeAll(() => {
    // Spy on fetchWithTimeout to ensure it's not called
    fetchSpy = jest.spyOn(utils, 'fetchWithTimeout');
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  it('returns undefined for domain when using embedded JSON and does not fetch', async () => {
    const url = await getRDAPBase('example.com', 'domain', { staticBootstrap: true });
    expect(url).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns undefined for IPv4 and IPv6 using embedded JSON and does not fetch', async () => {
    const url4 = await getRDAPBase('8.8.8.8', 'ip', { staticBootstrap: true });
    const url6 = await getRDAPBase('::1', 'ip', { staticBootstrap: true });
    expect(url4).toBeUndefined();
    expect(url6).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});