import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMClient, GenerateOptions } from './client.js';
import { RateLimiter, withRetry } from '../../utils/rateLimiter.js';
import { config } from '../../config.js';

/**
 * Gemini implementation of the LLM client.
 * Handles rate limiting (token bucket) and retries with exponential backoff.
 */
export class GeminiClient implements LLMClient {
  private model: GenerativeModel;
  private rateLimiter: RateLimiter;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.gemini.apiKey;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required. Get one free at https://aistudio.google.com/');
    }

    const genAI = new GoogleGenerativeAI(key);
    this.model = genAI.getGenerativeModel({
      model: modelName || config.gemini.model,
    });

    // Free tier: ~10 RPM — use 8 to leave headroom
    this.rateLimiter = new RateLimiter(8, 8);
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          ...(options.systemPrompt && {
            systemInstruction: { role: 'system', parts: [{ text: options.systemPrompt }] },
          }),
          generationConfig: {
            temperature: options.temperature ?? 0.3,
            maxOutputTokens: options.maxTokens ?? 8192,
          },
        });

        const response = result.response;
        const text = response.text();
        
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }

        return text;
      },
      {
        maxRetries: 3,
        initialDelayMs: 2000,
        maxDelayMs: 30000,
        onRetry: (error, attempt) => {
          console.warn(`[Gemini] Retry ${attempt}: ${error.message}`);
        },
      }
    );
  }

  async generateJSON<T>(prompt: string, options: GenerateOptions = {}): Promise<T> {
    const jsonPrompt = `${prompt}

CRITICAL: You MUST respond with ONLY valid JSON. No markdown code fences, no explanatory text, no comments. 
Start your response with { or [ and end with } or ].`;

    const text = await this.generate(jsonPrompt, {
      ...options,
      temperature: options.temperature ?? 0.2,
    });

    return parseJSONResponse<T>(text);
  }
}

/**
 * Extract and parse JSON from LLM response text.
 * Handles common issues: markdown fences, trailing commas, etc.
 */
function parseJSONResponse<T>(text: string): T {
  let cleaned = text.trim();

  // Remove markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Remove leading/trailing non-JSON characters
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  
  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON object or array found in response');
  } else if (firstBrace === -1) {
    start = firstBracket;
  } else if (firstBracket === -1) {
    start = firstBrace;
  } else {
    start = Math.min(firstBrace, firstBracket);
  }

  // Find matching closing brace/bracket
  let depth = 0;
  let end = start;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (ch === '\\') {
      escape = true;
      continue;
    }
    
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  cleaned = cleaned.slice(start, end + 1);

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // Remove JavaScript-style comments
  cleaned = cleaned.replace(/\/\/.*$/gm, '');

  try {
    return JSON.parse(cleaned) as T;
  } catch (_firstErr) {
    try {
      // Escape raw control characters inside JSON strings (newlines, tabs, form feeds)
      // eslint-disable-next-line no-control-regex
      const sanitized = cleaned.replace(/[\u0000-\u001F]/g, ch => {
        if (ch === '\n') return '\\n';
        if (ch === '\r') return '\\r';
        if (ch === '\t') return '\\t';
        return '';
      });
      return JSON.parse(sanitized) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON from LLM response: ${(error as Error).message}\nRaw: ${cleaned.slice(0, 500)}`);
    }
  }
}

/** Create a singleton Gemini client */
let _client: GeminiClient | null = null;

export function getGeminiClient(apiKey?: string): GeminiClient {
  if (!_client || apiKey) {
    _client = new GeminiClient(apiKey);
  }
  return _client;
}
