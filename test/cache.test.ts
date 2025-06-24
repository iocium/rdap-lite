import { memoryCache, kvCache, d1Cache } from '../src/cache';

describe('memoryCache', () => {
  test('returns undefined for missing key', async () => {
    const value = await memoryCache.get('non-existent');
    expect(value).toBeUndefined();
  });

  test('set and get with positive ttl', async () => {
    await memoryCache.set('foo', 'bar', 1);
    const value = await memoryCache.get('foo');
    expect(value).toBe('bar');
  });

  test('entries expire immediately with zero ttl', async () => {
    await memoryCache.set('baz', 'qux', 0);
    const value = await memoryCache.get('baz');
    expect(value).toBeUndefined();
  });
  test('set and get with default ttl', async () => {
    const key = 'default';
    await memoryCache.set(key, 'value');
    const value = await memoryCache.get(key);
    expect(value).toBe('value');
  });
});
// Tests for kvCache and d1Cache constructors
describe('kvCache', () => {
  test('returns an object with get and set', () => {
    const fakeNamespace = {} as any;
    const cache = kvCache(fakeNamespace);
    expect(cache).toHaveProperty('get');
    expect(cache).toHaveProperty('set');
  });
});

describe('d1Cache', () => {
  test('returns an object with get and set', () => {
    const fakeDB = {} as any;
    const cache = d1Cache(fakeDB);
    expect(cache).toHaveProperty('get');
    expect(cache).toHaveProperty('set');
  });
});