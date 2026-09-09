import { describe, it, expect } from 'vitest';
import { cleanHtml, extractTitle, extractLinks } from '../server/src/services/scraper/cleaner';

describe('HTML Scraper Cleaner', () => {
  it('should strip script, style, and header/footer elements', () => {
    const html = `
      <html>
        <head><title>Stripe Careers</title><style>body { color: red; }</style></head>
        <body>
          <header><nav><a href="/home">Home</a></nav></header>
          <script>console.log('secret');</script>
          <main>
            <h1>Engineering at Stripe</h1>
            <p>We build global financial infrastructure for the internet.</p>
            <ul>
              <li>High scale distributed systems</li>
              <li>Strong API design principles</li>
            </ul>
          </main>
          <footer>Copyright 2026 Stripe</footer>
        </body>
      </html>
    `;

    const cleaned = cleanHtml(html);
    expect(cleaned).toContain('## Engineering at Stripe');
    expect(cleaned).toContain('We build global financial infrastructure');
    expect(cleaned).toContain('- High scale distributed systems');
    expect(cleaned).not.toContain('color: red');
    expect(cleaned).not.toContain('Copyright 2026');
  });

  it('should extract title accurately', () => {
    const html = '<html><head><title>Senior Backend Engineer - Stripe</title></head><body><h1>Senior Backend Engineer</h1></body></html>';
    expect(extractTitle(html)).toBe('Senior Backend Engineer - Stripe');
  });

  it('should extract title from h1 if title tag is absent', () => {
    const html = '<html><body><h1>Staff Platform Engineer</h1></body></html>';
    expect(extractTitle(html)).toBe('Staff Platform Engineer');
  });

  it('should extract same-origin links and skip media/relative links', () => {
    const html = `
      <a href="/jobs/123">Job 123</a>
      <a href="https://stripe.com/about">About Stripe</a>
      <a href="https://external-site.com/test">External</a>
      <a href="/resume.pdf">PDF Resume</a>
      <a href="#section">Anchor</a>
    `;

    const links = extractLinks(html, 'https://stripe.com/jobs');
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://stripe.com/jobs/123');
    expect(links[1].url).toBe('https://stripe.com/about');
  });
});
