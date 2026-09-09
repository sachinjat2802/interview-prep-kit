import { describe, it, expect } from 'vitest';
import { extractRequirements } from '../server/src/services/pipeline/extractor';
import { LLMClient } from '../server/src/services/llm/client';

describe('Requirement Extractor & Fallbacks', () => {
  it('should parse valid structured LLM responses', async () => {
    const mockLlm: LLMClient = {
      async generateText() { return ''; },
      async generateJSON<T>() {
        return {
          title: 'Senior Frontend Engineer',
          requirements: [
            { id: 'r1', text: '5+ years React experience', kind: 'technical', priority: 'must' },
            { id: 'r2', text: 'State management via Redux/Zustand', kind: 'technical', priority: 'nice' },
          ],
        } as unknown as T;
      },
    };

    const result = await extractRequirements('Job Description Sample', mockLlm);
    expect(result.title).toBe('Senior Frontend Engineer');
    expect(result.requirements).toHaveLength(2);
    expect(result.requirements[0].id).toBe('r1');
  });

  it('should use fallback text parsing when LLM JSON generation fails', async () => {
    const mockFailingLlm: LLMClient = {
      async generateText() { return ''; },
      async generateJSON() {
        throw new Error('LLM rate limited');
      },
    };

    const rawJd = `
      Senior Backend Engineer position;
      Must have 5+ years experience building microservices in Node.js;
      Strong knowledge of PostgreSQL and database indexing;
      Demonstrated experience with Redis caching and system design;
    `;

    const result = await extractRequirements(rawJd, mockFailingLlm);
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.requirements[0].kind).toBe('technical');
    expect(result.requirements[0].priority).toBe('must');
  });

  it('should parse role_title key from LLM response for non-software roles like Bike Driver', async () => {
    const mockLlm: LLMClient = {
      async generateText() { return ''; },
      async generateJSON<T>() {
        return {
          role_title: 'Bike Driver',
          seniority: 'Entry',
          requirements: [
            { id: 'r1', text: 'Valid driver license and clean driving record', kind: 'domain', priority: 'must' },
            { id: 'r2', text: 'Knowledge of city routes and navigation apps', kind: 'technical', priority: 'must' },
          ],
        } as unknown as T;
      },
    };

    const result = await extractRequirements('Bike Driver position', mockLlm);
    expect(result.title).toBe('Bike Driver');
    expect(result.requirements).toHaveLength(2);
  });

  it('should fallback to title from initial line of text when LLM returns empty title', async () => {
    const mockLlm: LLMClient = {
      async generateText() { return ''; },
      async generateJSON<T>() {
        return {
          requirements: [
            { id: 'r1', text: 'Daily food delivery via motorbike', kind: 'domain', priority: 'must' },
          ],
        } as unknown as T;
      },
    };

    const result = await extractRequirements('Bike Driver', mockLlm);
    expect(result.title).toBe('Bike Driver');
  });
});
