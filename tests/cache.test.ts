import { describe, it, expect } from 'vitest';
import { TTLStore } from '../server/src/utils/cache';

describe('TTL Cache Utility', () => {
  it('should store and retrieve values within TTL', () => {
    const store = new TTLStore<string>(60);
    store.set('key1', 'value1');
    expect(store.get('key1')).toBe('value1');
    expect(store.has('key1')).toBe(true);
  });

  it('should return null for expired items', () => {
    const store = new TTLStore<string>(1);
    // Artificially set expired entry
    store.set('expiredKey', 'oldData', -1);
    expect(store.get('expiredKey')).toBeNull();
    expect(store.has('expiredKey')).toBe(false);
  });

  it('should clear all entries', () => {
    const store = new TTLStore<number>(30);
    store.set('a', 1);
    store.set('b', 2);
    expect(store.size).toBe(2);
    store.clear();
    expect(store.get('a')).toBeNull();
    expect(store.get('b')).toBeNull();
    expect(store.size).toBe(0);
  });

  it('should support explicit key deletion and size reporting', () => {
    const store = new TTLStore<string>(60);
    store.set('k1', 'val1');
    store.set('k2', 'val2');
    expect(store.size).toBe(2);
    expect(store.delete('k1')).toBe(true);
    expect(store.get('k1')).toBeNull();
    expect(store.size).toBe(1);
  });
});
