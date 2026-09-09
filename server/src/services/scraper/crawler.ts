import { fetchUrl } from './fetcher.js';
import { isAllowedByRobots } from './robots.js';
import { cleanHtml, extractTitle, extractLinks } from './cleaner.js';
import { config } from '../../config.js';
import { domainScrapeCache } from '../../utils/cache.js';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  isHiringPage: boolean;
  error?: string;
}

export interface CrawlSummary {
  pages: CrawlResult[];
  hiringPage: CrawlResult | null;
  pagesUsed: string[];
  errors: string[];
}

// Keywords for scoring link relevance
const HIRING_KEYWORDS = [
  'career', 'careers', 'jobs', 'job', 'hiring', 'hire', 'join',
  'work-with-us', 'work-at', 'openings', 'positions', 'opportunities',
  'apply', 'recruitment', 'talent',
];

const ABOUT_KEYWORDS = [
  'about', 'about-us', 'team', 'people', 'culture', 'values',
  'mission', 'story', 'company', 'who-we-are',
];

const ENGINEERING_KEYWORDS = [
  'engineering', 'blog', 'tech', 'technology', 'handbook',
  'how-we-work', 'practices', 'process', 'interview',
];

// Keywords that indicate a page discusses hiring/interview process
const HIRING_CONTENT_KEYWORDS = [
  'interview', 'hiring process', 'application process', 'how we hire',
  'recruitment', 'what to expect', 'interview stages', 'assessment',
  'take-home', 'coding challenge', 'technical interview', 'onsite',
  'phone screen', 'cultural fit', 'offer', 'compensation',
];

/**
 * Score a link based on its URL and text for relevance to interview prep.
 */
function scoreLink(url: string, text: string): number {
  const lowerUrl = url.toLowerCase();
  const lowerText = text.toLowerCase();
  let score = 0;

  // Check URL path
  for (const kw of HIRING_KEYWORDS) {
    if (lowerUrl.includes(kw)) score += 5;
  }
  for (const kw of ABOUT_KEYWORDS) {
    if (lowerUrl.includes(kw)) score += 3;
  }
  for (const kw of ENGINEERING_KEYWORDS) {
    if (lowerUrl.includes(kw)) score += 4;
  }

  // Check link text
  for (const kw of HIRING_KEYWORDS) {
    if (lowerText.includes(kw)) score += 4;
  }
  for (const kw of ABOUT_KEYWORDS) {
    if (lowerText.includes(kw)) score += 2;
  }
  for (const kw of ENGINEERING_KEYWORDS) {
    if (lowerText.includes(kw)) score += 3;
  }

  // Penalize very deep paths (likely not main pages)
  const pathDepth = (new URL(url).pathname.match(/\//g) || []).length;
  if (pathDepth > 4) score -= 2;

  return score;
}

/**
 * Check if page content discusses hiring/interview process.
 */
function isHiringContent(content: string): boolean {
  const lower = content.toLowerCase();
  let matches = 0;
  for (const kw of HIRING_CONTENT_KEYWORDS) {
    if (lower.includes(kw)) matches++;
  }
  // Need at least 2 keyword matches to be considered a hiring page
  return matches >= 2;
}

/**
 * Crawl a company website to find relevant pages for interview preparation.
 * 
 * Strategy:
 * 1. Check in-memory domain cache
 * 2. Fetch homepage
 * 3. Extract and score all links
 * 4. Fetch top-scored pages (respecting robots.txt)
 * 5. Identify hiring page by content analysis
 */
export async function crawlCompanySite(
  companyUrl: string,
  options: { allowPrivate?: boolean; maxPages?: number } = {}
): Promise<CrawlSummary> {
  const cacheKey = companyUrl.toLowerCase().trim();
  const cached = domainScrapeCache.get(cacheKey);
  if (cached) {
    console.log(`[Crawler] Serving cached crawl results for: ${cacheKey}`);
    return cached as CrawlSummary;
  }
  const maxPages = options.maxPages || config.scraping.maxCrawlPages;
  const allowPrivate = options.allowPrivate || false;
  const pages: CrawlResult[] = [];
  const errors: string[] = [];
  const fetchedUrls = new Set<string>();

  // Normalize the base URL
  let baseUrl = companyUrl.trim();
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = 'https://' + baseUrl;
  }
  // Ensure trailing slash for proper URL resolution
  const parsedBase = new URL(baseUrl);
  if (parsedBase.pathname === '' || parsedBase.pathname === '/') {
    baseUrl = parsedBase.origin + '/';
  }

  // Step 1: Fetch the homepage
  console.log(`[Crawler] Fetching homepage: ${baseUrl}`);
  const homepageResult = await fetchUrl(baseUrl, { allowPrivate });

  if (homepageResult.error || homepageResult.status >= 400) {
    errors.push(`Initial fetch failed: ${homepageResult.error || `HTTP ${homepageResult.status}`}`);
    
    // Try domain root URL (e.g. https://www.accenture.com/)
    const rootUrl = parsedBase.origin + '/';
    console.log(`[Crawler] Target URL failed, falling back to root domain: ${rootUrl}`);
    const rootResult = await fetchUrl(rootUrl, { allowPrivate });

    if (!rootResult.error && rootResult.status < 400) {
      Object.assign(homepageResult, rootResult);
      baseUrl = rootUrl;
    } else {
      // Try with/without www
      const altUrl = baseUrl.includes('://www.') 
        ? baseUrl.replace('://www.', '://') 
        : baseUrl.replace('://', '://www.');
      
      const altResult = await fetchUrl(altUrl, { allowPrivate });
      if (!altResult.error && altResult.status < 400) {
        Object.assign(homepageResult, altResult);
        baseUrl = altUrl;
      } else {
        errors.push(`All URL variants failed: ${altResult.error || `HTTP ${altResult.status}`}`);
        return { pages, hiringPage: null, pagesUsed: [], errors };
      }
    }
  }

  fetchedUrls.add(baseUrl);
  const homepageCleaned = cleanHtml(homepageResult.body);
  const homepageTitle = extractTitle(homepageResult.body);
  
  pages.push({
    url: baseUrl,
    title: homepageTitle,
    content: homepageCleaned,
    isHiringPage: isHiringContent(homepageCleaned),
  });

  // Step 2: Extract and score links
  const links = extractLinks(homepageResult.body, baseUrl);
  console.log(`[Crawler] Found ${links.length} links on homepage`);

  const scoredLinks = links
    .map(link => ({
      ...link,
      score: scoreLink(link.url, link.text),
    }))
    .filter(link => link.score > 0)
    .sort((a, b) => b.score - a.score);

  // Step 3: Fetch top-scored pages
  const pagesToFetch = scoredLinks.slice(0, maxPages - 1); // -1 for homepage

  for (const link of pagesToFetch) {
    if (fetchedUrls.has(link.url)) continue;

    // Check robots.txt
    const allowed = await isAllowedByRobots(link.url, allowPrivate);
    if (!allowed) {
      console.log(`[Crawler] Blocked by robots.txt: ${link.url}`);
      continue;
    }

    console.log(`[Crawler] Fetching (score ${link.score}): ${link.url}`);
    const result = await fetchUrl(link.url, { allowPrivate });
    fetchedUrls.add(link.url);

    if (result.error || result.status >= 400) {
      errors.push(`Failed to fetch ${link.url}: ${result.error || `HTTP ${result.status}`}`);
      continue;
    }

    const content = cleanHtml(result.body);
    const title = extractTitle(result.body);

    pages.push({
      url: link.url,
      title,
      content,
      isHiringPage: isHiringContent(content),
    });

    // Also extract links from this page for deeper discovery
    if (pages.length < maxPages) {
      const subLinks = extractLinks(result.body, link.url);
      const scoredSubLinks = subLinks
        .filter(sl => !fetchedUrls.has(sl.url))
        .map(sl => ({ ...sl, score: scoreLink(sl.url, sl.text) }))
        .filter(sl => sl.score >= 5) // Only high-scoring sublinks
        .sort((a, b) => b.score - a.score);

      for (const subLink of scoredSubLinks.slice(0, 3)) {
        if (fetchedUrls.has(subLink.url) || pages.length >= maxPages) continue;

        const subAllowed = await isAllowedByRobots(subLink.url, allowPrivate);
        if (!subAllowed) continue;

        console.log(`[Crawler] Fetching sub-link (score ${subLink.score}): ${subLink.url}`);
        const subResult = await fetchUrl(subLink.url, { allowPrivate });
        fetchedUrls.add(subLink.url);

        if (subResult.error || subResult.status >= 400) {
          errors.push(`Failed to fetch ${subLink.url}: ${subResult.error || `HTTP ${subResult.status}`}`);
          continue;
        }

        const subContent = cleanHtml(subResult.body);
        const subTitle = extractTitle(subResult.body);

        pages.push({
          url: subLink.url,
          title: subTitle,
          content: subContent,
          isHiringPage: isHiringContent(subContent),
        });
      }
    }
  }

  // Find the best hiring page
  const hiringPage = pages.find(p => p.isHiringPage) || null;

  console.log(`[Crawler] Done: ${pages.length} pages crawled, hiring page ${hiringPage ? 'found' : 'not found'}`);

  const summary: CrawlSummary = {
    pages,
    hiringPage,
    pagesUsed: pages.map(p => p.url),
    errors,
  };

  // Cache results for reuse (e.g., batch mode running multiple cases for the same domain)
  domainScrapeCache.set(cacheKey, summary);

  return summary;
}
