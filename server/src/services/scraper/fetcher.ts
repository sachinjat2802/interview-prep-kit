import axios, { AxiosError } from 'axios';
import { config } from '../../config.js';
import { validateUrl, isAllowedContentType, ValidateUrlOptions } from '../../utils/urlValidator.js';
import { RateLimiter } from '../../utils/rateLimiter.js';

export interface FetchResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  error?: string;
}

// Per-domain rate limiters to be respectful
const domainLimiters = new Map<string, RateLimiter>();

function getDomainLimiter(hostname: string): RateLimiter {
  if (!domainLimiters.has(hostname)) {
    // 2 requests per 3 seconds per domain — very respectful
    domainLimiters.set(hostname, new RateLimiter(2, 40));
  }
  return domainLimiters.get(hostname)!;
}

/**
 * Fetch a URL with safety checks, rate limiting, and size limits.
 */
export async function fetchUrl(
  url: string,
  options: ValidateUrlOptions & { maxSize?: number } = {}
): Promise<FetchResult> {
  // Validate URL
  const validation = await validateUrl(url, options);
  if (!validation.valid) {
    return {
      url,
      status: 0,
      contentType: '',
      body: '',
      error: validation.error,
    };
  }

  const validatedUrl = validation.url!;

  try {
    const parsed = new URL(validatedUrl);
    const limiter = getDomainLimiter(parsed.hostname);
    await limiter.acquire();

    const response = await axios.get(validatedUrl, {
      timeout: config.scraping.fetchTimeout,
      maxContentLength: options.maxSize || config.scraping.maxResponseSize,
      maxBodyLength: options.maxSize || config.scraping.maxResponseSize,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      responseType: 'text',
      // Don't follow more than 5 redirects
      maxRedirects: 5,
      // Accept any status to handle gracefully
      validateStatus: () => true,
    });

    // Check content type
    const contentType = String(response.headers['content-type'] || '');
    if (!isAllowedContentType(contentType)) {
      return {
        url: validatedUrl,
        status: response.status,
        contentType,
        body: '',
        error: `Unexpected content type: ${contentType}`,
      };
    }

    return {
      url: validatedUrl,
      status: response.status,
      contentType,
      body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    let errorMsg = 'Fetch failed';
    
    if (axiosError.code === 'ECONNABORTED') {
      errorMsg = `Request timed out after ${config.scraping.fetchTimeout}ms`;
    } else if (axiosError.code === 'ENOTFOUND') {
      errorMsg = 'Domain not found';
    } else if (axiosError.code === 'ECONNREFUSED') {
      errorMsg = 'Connection refused';
    } else if (axiosError.message) {
      errorMsg = axiosError.message;
    }

    return {
      url: validatedUrl,
      status: 0,
      contentType: '',
      body: '',
      error: errorMsg,
    };
  }
}
