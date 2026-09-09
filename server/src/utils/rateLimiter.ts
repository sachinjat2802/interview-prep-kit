/**
 * Token-bucket rate limiter for controlling request rates.
 * Used for both LLM API calls and web scraping.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  /**
   * @param maxTokens Maximum number of tokens (burst capacity)
   * @param refillPerMinute How many tokens to add per minute
   */
  constructor(maxTokens: number, refillPerMinute: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillPerMinute / 60;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  /**
   * Wait until a token is available, then consume it.
   * Returns the number of milliseconds waited.
   */
  async acquire(): Promise<number> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return 0;
    }

    // Calculate wait time for next token
    const deficit = 1 - this.tokens;
    const waitMs = Math.ceil((deficit / this.refillRate) * 1000);
    
    await sleep(waitMs);
    this.refill();
    this.tokens -= 1;
    return waitMs;
  }

  /** Check if a token is available without consuming it */
  canAcquire(): boolean {
    this.refill();
    return this.tokens >= 1;
  }
}

/**
 * Keyed rate limiter for managing per-IP or per-user buckets with active pruning.
 */
export class KeyedRateLimiter {
  private limiters = new Map<string, RateLimiter>();
  private lastPrune = Date.now();

  constructor(
    private maxTokens: number,
    private refillPerMinute: number,
    private ttlMs = 300000
  ) {}

  getLimiter(key: string): RateLimiter {
    this.pruneIfNeeded();
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new RateLimiter(this.maxTokens, this.refillPerMinute);
      this.limiters.set(key, limiter);
    }
    return limiter;
  }

  private pruneIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastPrune > this.ttlMs) {
      this.limiters.clear();
      this.lastPrune = now;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) break;

      const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * 0.1 * Math.random();
      
      onRetry?.(lastError, attempt + 1);
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}
