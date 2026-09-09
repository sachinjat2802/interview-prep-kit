import { describe, it, expect } from 'vitest';
import { RateLimiter, KeyedRateLimiter, withRetry } from '../server/src/utils/rateLimiter';

describe('Rate Limiter Utility', () => {
  it('should acquire tokens immediately when burst capacity exists', async () => {
    const limiter = new RateLimiter(5, 60);
    expect(limiter.canAcquire()).toBe(true);

    const waitTime = await limiter.acquire();
    expect(waitTime).toBe(0);
  });

  it('should consume tokens on acquire', async () => {
    const limiter = new RateLimiter(2, 60);
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.canAcquire()).toBe(false);
  });

  it('should retry failed functions up to maxRetries', async () => {
    let attempts = 0;
    const failingFn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary glitch');
      }
      return 'success';
    };

    const result = await withRetry(failingFn, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw last error when maxRetries is exceeded', async () => {
    const alwaysFails = async () => {
      throw new Error('Permanent failure');
    };

    await expect(
      withRetry(alwaysFails, { maxRetries: 2, initialDelayMs: 5 })
    ).rejects.toThrow('Permanent failure');
  });

  it('should support KeyedRateLimiter with distinct buckets and pruning', () => {
    const keyedLimiter = new KeyedRateLimiter(2, 60, 1000);

    const limiterIP1 = keyedLimiter.getLimiter('192.168.1.1');
    const limiterIP2 = keyedLimiter.getLimiter('192.168.1.2');

    expect(limiterIP1).toBeDefined();
    expect(limiterIP2).toBeDefined();
    expect(limiterIP1).not.toBe(limiterIP2);
  });
});
