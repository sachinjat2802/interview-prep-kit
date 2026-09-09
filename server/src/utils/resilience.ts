/**
 * Resilient Retry Helper with Exponential Backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (options.onRetry) {
        options.onRetry(err, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
    }
  }
}
