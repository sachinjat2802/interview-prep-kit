import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve4);

// Private/reserved IP ranges that should be blocked in production (SSRF prevention)
const PRIVATE_RANGES = [
  /^127\./,                    // 127.0.0.0/8 loopback
  /^10\./,                     // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
  /^192\.168\./,               // 192.168.0.0/16 private
  /^0\./,                      // 0.0.0.0/8
  /^169\.254\./,               // link-local
  /^fc00:/i,                   // IPv6 private
  /^fe80:/i,                   // IPv6 link-local
  /^::1$/,                     // IPv6 loopback
];

export interface ValidateUrlOptions {
  /** Allow localhost/private IPs (for batch mode with local test servers) */
  allowPrivate?: boolean;
}

export interface UrlValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}

/**
 * Validate a URL for safety before fetching.
 * - Checks scheme (http/https only)
 * - Rejects credentials in URL
 * - In production mode, resolves hostname and rejects private IPs
 */
const SCHEME_REGEX = /^[a-z0-9+.-]+:\/\//i;
const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
]);

export async function validateUrl(
  input: string,
  options: ValidateUrlOptions = {}
): Promise<UrlValidationResult> {
  try {
    // Ensure it has a scheme
    let urlStr = input.trim();
    if (!SCHEME_REGEX.test(urlStr)) {
      urlStr = 'https://' + urlStr;
    }

    const parsed = new URL(urlStr);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Reject credentials in URL
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'URLs with credentials are not allowed' };
    }

    // SSRF check: resolve hostname and check against private ranges
    if (!options.allowPrivate) {
      const hostname = parsed.hostname;
      
      // Check if hostname is an IP directly
      if (isPrivateIp(hostname)) {
        return { valid: false, error: 'Private/loopback addresses are not allowed' };
      }

      // Resolve DNS and check
      try {
        const addresses = await dnsResolve(hostname);
        for (const addr of addresses) {
          if (isPrivateIp(addr)) {
            return { valid: false, error: `Hostname resolves to private address: ${addr}` };
          }
        }
      } catch {
        // DNS resolution failed — could be a valid hostname not yet propagated
        // Let the actual fetch handle this
      }
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function isPrivateIp(ip: string): boolean {
  for (const range of PRIVATE_RANGES) {
    if (range.test(ip)) return true;
  }
  return false;
}

/** Validate content type is in the allowed set */
export function isAllowedContentType(contentType: string): boolean {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.has(normalized);
}
