import { describe, it, expect } from 'vitest';
import { validateUrl, isAllowedContentType } from '../server/src/utils/urlValidator';

describe('URL Validator & SSRF Protection', () => {
  it('should validate public HTTPS URLs', async () => {
    const result = await validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com/');
  });

  it('should prepends https:// if scheme is omitted', async () => {
    const result = await validateUrl('stripe.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://stripe.com/');
  });

  it('should reject URLs with embedded credentials', async () => {
    const result = await validateUrl('https://admin:secret@example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('credentials');
  });

  it('should reject non-HTTP/HTTPS protocols', async () => {
    const result = await validateUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Only HTTP and HTTPS URLs are allowed');
  });

  it('should reject loopback/private IP 127.0.0.1 when allowPrivate is false', async () => {
    const result = await validateUrl('http://127.0.0.1:8080', { allowPrivate: false });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Private/loopback');
  });

  it('should reject 10.x.x.x private range when allowPrivate is false', async () => {
    const result = await validateUrl('http://10.0.0.1/admin', { allowPrivate: false });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Private/loopback');
  });

  it('should allow private IPs when allowPrivate is explicitly true', async () => {
    const result = await validateUrl('http://127.0.0.1:8099/test', { allowPrivate: true });
    expect(result.valid).toBe(true);
    expect(result.url).toBe('http://127.0.0.1:8099/test');
  });

  it('should validate allowed content types correctly', () => {
    expect(isAllowedContentType('text/html; charset=UTF-8')).toBe(true);
    expect(isAllowedContentType('application/json')).toBe(true);
    expect(isAllowedContentType('image/png')).toBe(false);
    expect(isAllowedContentType('application/octet-stream')).toBe(false);
  });
});
