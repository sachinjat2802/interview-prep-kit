import { fetchUrl } from '../scraper/fetcher.js';

export interface DiscussionResult {
  query: string;
  snippets: string[];
  sources: string[];
  error?: string;
}

/**
 * Search for public discussion about a company's interview process.
 * Uses DuckDuckGo HTML search (no API key required).
 */
export async function searchPublicDiscussion(
  companyName: string
): Promise<DiscussionResult> {
  const cleanName = companyName.trim() || 'target company';
  const queries = [
    `${cleanName} interview questions glassdoor leetcode`,
    `${cleanName} technical coding interview questions geeksforgeeks`,
    `${cleanName} engineering interview experience reddit`,
    `${cleanName} tech stack architecture github`,
    `${cleanName} system design interview experience`,
  ];

  const allSnippets: string[] = [];
  const allSources: string[] = [];

  const searchPromises = queries.map(async query => {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const result = await fetchUrl(searchUrl, { allowPrivate: false });
    if (result.error || result.status !== 200) return null;
    return parseDuckDuckGoResults(result.body);
  });

  const settled = await Promise.allSettled(searchPromises);

  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value) {
      allSnippets.push(...item.value.snippets);
      allSources.push(...item.value.sources);
    }
  }

  // Deduplicate
  const uniqueSources = [...new Set(allSources)];

  return {
    query: queries.join(' | '),
    snippets: allSnippets.slice(0, 25), // Expanded snippets for rich context
    sources: uniqueSources.slice(0, 10),
  };
}

function parseDuckDuckGoResults(html: string): { snippets: string[]; sources: string[] } {
  const snippets: string[] = [];
  const sources: string[] = [];

  try {
    // Use cheerio-style parsing via regex for simplicity
    // DuckDuckGo results have class="result__snippet" and class="result__url"
    
    const snippetRegex = /class="result__snippet"[^>]*>(.*?)<\//gs;
    let match;
    while ((match = snippetRegex.exec(html)) !== null) {
      const text = match[1]
        .replace(/<[^>]+>/g, '') // Strip HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim();
      if (text.length > 20) {
        snippets.push(text);
      }
    }

    const urlRegex = /class="result__url"[^>]*>(.*?)<\//gs;
    while ((match = urlRegex.exec(html)) !== null) {
      const url = match[1].replace(/<[^>]+>/g, '').trim();
      if (url) {
        sources.push(url.startsWith('http') ? url : `https://${url}`);
      }
    }
  } catch (error) {
    console.warn('[Search] Failed to parse DuckDuckGo results:', error);
  }

  return { snippets, sources };
}
