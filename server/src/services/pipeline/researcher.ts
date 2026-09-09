import { crawlCompanySite, CrawlSummary } from '../scraper/crawler.js';
import { searchPublicDiscussion, DiscussionResult } from '../search/discussion.js';

export interface ResearchBundle {
  crawl: CrawlSummary;
  discussion: DiscussionResult;
  /** Combined content from all crawled pages for LLM context */
  combinedContent: string;
  /** Hiring-specific content if found */
  hiringContent: string;
  /** All source URLs used */
  allSources: string[];
}

/**
 * Orchestrates company research:
 * 1. Crawl the company website
 * 2. Search for public discussion of their interview process
 * 3. Combine results into a research bundle
 */
export async function researchCompany(
  companyUrl: string,
  companyName: string,
  options: { allowPrivate?: boolean } = {}
): Promise<ResearchBundle> {
  // Run crawling and discussion search in parallel
  const [crawl, discussion] = await Promise.all([
    crawlCompanySite(companyUrl, { allowPrivate: options.allowPrivate }),
    searchPublicDiscussion(companyName).catch(err => {
      console.warn('[Researcher] Discussion search failed:', err);
      return { query: '', snippets: [], sources: [], error: String(err) } as DiscussionResult;
    }),
  ]);

  // Combine crawled content
  const combinedContent = crawl.pages
    .map(p => `=== Page: ${p.title || p.url} ===\n${p.content}`)
    .join('\n\n')
    .slice(0, 15000); // Keep within LLM context limits

  // Extract hiring-specific content
  const hiringContent = crawl.hiringPage
    ? crawl.hiringPage.content
    : '';

  // Add discussion snippets to hiring content
  const hiringWithDiscussion = [
    hiringContent,
    discussion.snippets.length > 0
      ? '\n=== Public Discussion ===\n' + discussion.snippets.join('\n')
      : '',
  ].join('\n').trim();

  // Collect all sources
  const allSources = [
    ...crawl.pagesUsed,
    ...discussion.sources,
  ];

  return {
    crawl,
    discussion,
    combinedContent,
    hiringContent: hiringWithDiscussion,
    allSources: [...new Set(allSources)],
  };
}
