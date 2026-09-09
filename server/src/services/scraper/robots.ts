import robotsParser from 'robots-parser';
import { fetchUrl } from './fetcher.js';

// Cache parsed robots.txt per domain
const robotsCache = new Map<string, { parser: ReturnType<typeof robotsParser>; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Check if a URL is allowed by the site's robots.txt.
 */
export async function isAllowedByRobots(url: string, allowPrivate = false): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const cacheKey = parsed.host;

    // Check cache
    const cached = robotsCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.parser.isAllowed(url, 'InterviewPrepKit') ?? true;
    }

    // Fetch robots.txt
    const result = await fetchUrl(robotsUrl, { allowPrivate });

    let parser: ReturnType<typeof robotsParser>;
    if (result.status === 200 && result.body) {
      parser = robotsParser(robotsUrl, result.body);
    } else {
      // No robots.txt or error — assume everything is allowed
      parser = robotsParser(robotsUrl, '');
    }

    robotsCache.set(cacheKey, { parser, fetchedAt: Date.now() });
    return parser.isAllowed(url, 'InterviewPrepKit') ?? true;
  } catch {
    // On error, assume allowed (fail open for crawling)
    return true;
  }
}

/** Clear the robots cache (useful for testing) */
export function clearRobotsCache(): void {
  robotsCache.clear();
}
