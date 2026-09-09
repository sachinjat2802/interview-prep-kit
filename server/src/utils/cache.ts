/**
 * In-Memory TTL Cache Utility for System Design & Crawling Performance
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLStore<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTLMs: number;
  private maxCapacity: number;

  constructor(defaultTTLMinutes = 60, maxCapacity = 500) {
    this.defaultTTLMs = defaultTTLMinutes * 60 * 1000;
    this.maxCapacity = maxCapacity;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMinutes?: number): void {
    // Evict oldest entry if max capacity reached
    if (this.cache.size >= this.maxCapacity && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const ttlMs = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTLMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const domainScrapeCache = new TTLStore<unknown>(120); // 2 hours TTL for domain scrapes
export const companyBriefCache = new TTLStore<unknown>(180); // 3 hours TTL for company briefs
