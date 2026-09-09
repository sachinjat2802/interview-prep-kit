import * as cheerio from 'cheerio';

/**
 * Clean HTML content into readable text suitable for LLM processing.
 * Strips scripts, styles, navigation, and other non-content elements.
 */
export function cleanHtml(html: string, maxLength = 8000): string {
  if (!html) return '';
  // Truncate raw HTML input if exceeds 500KB to protect against regex backtracking & memory spikes
  const inputHtml = html.length > 500000 ? html.slice(0, 500000) : html;

  // Pre-strip heavy script, style, svg, iframe, and noscript tags via a single-pass combined regex
  const preCleaned = inputHtml.replace(/<(script|style|svg|iframe|noscript)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  const $ = cheerio.load(preCleaned);

  // Remove non-content elements
  $('img, video, audio, canvas').remove();
  $('nav, header, footer, .nav, .header, .footer, .sidebar, .menu').remove();
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
  $('.cookie-banner, .cookie-notice, #cookie-consent').remove();
  $('.ad, .ads, .advertisement, [class*="ad-"]').remove();

  // Get the main content area if identifiable
  let contentArea = $('main, article, [role="main"], .content, .main-content, #content, #main');
  if (contentArea.length === 0) {
    contentArea = $('body');
  }

  // Extract text into chunk array buffer to eliminate V8 string reallocation overhead
  const chunks: string[] = [];
  
  contentArea.find('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre, dd, dt').each((_i, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || '';
    const elText = $(el).text().trim();
    
    if (!elText) return;

    if (tag.startsWith('h')) {
      chunks.push(`\n## ${elText}\n`);
    } else if (tag === 'li') {
      chunks.push(`- ${elText}\n`);
    } else {
      chunks.push(`${elText}\n`);
    }
  });

  // Clean up
  let text = chunks
    .join('')
    .replace(/\n{3,}/g, '\n\n')  // Collapse multiple newlines
    .replace(/[ \t]+/g, ' ')      // Collapse whitespace
    .trim();

  // Fallback: If tag-based extraction yielded < 100 chars, pull text directly from body
  if (text.length < 100) {
    const rawBodyText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (rawBodyText.length > text.length) {
      text = rawBodyText;
    }
  }

  // Truncate to max length
  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '\n\n[Content truncated]';
  }

  return text;
}

/**
 * Extract the page title from HTML.
 */
export function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').text().trim() || $('h1').first().text().trim() || '';
}

/**
 * Extract all links from HTML, resolving relative URLs.
 */
export function extractLinks(html: string, baseUrl: string): Array<{ url: string; text: string }> {
  const $ = cheerio.load(html);
  const links: Array<{ url: string; text: string }> = [];
  const seen = new Set<string>();

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    
    if (!href) return;

    // Skip non-http links, anchors, javascript, mailto, tel
    if (href.startsWith('#') || href.startsWith('javascript:') || 
        href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    try {
      const resolved = new URL(href, baseUrl).toString();
      
      // Deduplicate and keep same-origin only
      const base = new URL(baseUrl);
      const link = new URL(resolved);
      
      if (link.hostname !== base.hostname) return;
      
      // Remove hash fragments for dedup
      link.hash = '';
      const normalized = link.toString();
      
      if (seen.has(normalized)) return;
      seen.add(normalized);

      // Skip common non-content extensions
      const path = link.pathname.toLowerCase();
      if (/\.(pdf|zip|tar|gz|png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot|mp4|mp3|webp)$/.test(path)) {
        return;
      }

      links.push({ url: normalized, text: text || path });
    } catch {
      // Invalid URL — skip
    }
  });

  return links;
}
