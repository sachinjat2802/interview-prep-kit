import { LLMClient } from '../llm/client.js';
import { extractRequirementsPrompt } from '../llm/prompts.js';

export interface ExtractedRole {
  title: string;
  seniority: string;
  location: string;
  company: string;
  responsibilities: string[];
  requirements: Array<{
    id: string;
    text: string;
    kind: 'technical' | 'behavioural' | 'domain';
    priority: 'must' | 'nice';
  }>;
}

/**
 * Extract requirements and role info from a job description using the LLM.
 * Validates the output structure and ensures stable IDs.
 */
export async function extractRequirements(
  jdText: string,
  llm: LLMClient
): Promise<ExtractedRole> {
  const prompt = extractRequirementsPrompt(jdText);
  let result: unknown;
  try {
    result = await llm.generateJSON<ExtractedRole>(prompt);
  } catch (err) {
    console.warn('[Extractor] LLM JSON generation failed, using fallback:', err);
    result = {};
  }

  const validated: ExtractedRole = {
    title: '',
    seniority: '',
    location: '',
    company: '',
    responsibilities: [],
    requirements: [],
  };

  if (!result || typeof result !== 'object') {
    result = {};
  }

  const resObj = result as Record<string, unknown>;

  const rawTitle = resObj.role_title || resObj.title || resObj.role || resObj.position;
  if (typeof rawTitle === 'string' && rawTitle.trim()) {
    validated.title = rawTitle.trim();
  }

  // Fallback: If title remains empty, derive title from the initial line of jdText
  if (!validated.title && jdText.trim()) {
    const firstLine = jdText.trim().split('\n')[0].replace(/^[\s\-*•\d.)]+/, '').trim();
    if (firstLine.length > 0 && firstLine.length <= 80) {
      validated.title = firstLine;
    }
  }

  if (Array.isArray(resObj.requirements)) {
    validated.requirements = resObj.requirements
      .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
      .map((r, i) => ({
        id: typeof r.id === 'string' ? r.id : `r${i + 1}`,
        text: String(r.text || r.requirement || '').trim(),
        kind: validateKind(String(r.kind || '')),
        priority: validatePriority(String(r.priority || '')),
      }))
      .filter(r => r.text.length > 0);
  }

  // Also check nested candidate keys if requirements empty
  const candidateKeys = [
    'key_requirements', 'technical_skills', 'soft_skills',
    'items', 'extracted_requirements'
  ];

  const rawList: unknown[] = [];
  for (const key of candidateKeys) {
    const val = resObj[key];
    if (Array.isArray(val)) {
      rawList.push(...val);
    }
  }

  if (rawList.length === 0 && Array.isArray(result)) {
    rawList.push(...result);
  }

  if (rawList.length > 0 && validated.requirements.length === 0) {
    validated.requirements = rawList.map((r: unknown, i: number) => {
      const rObj = typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : null;
      const text = typeof r === 'string' 
        ? r 
        : String(rObj?.text || rObj?.requirement || rObj?.name || rObj?.description || rObj?.title || rObj?.skill || rObj?.item || '');
      return {
        id: rObj?.id ? String(rObj.id) : `r${i + 1}`,
        text: String(text).trim(),
        kind: validateKind(String(rObj?.kind || '')),
        priority: validatePriority(String(rObj?.priority || '')),
      };
    }).filter(r => r.text.length > 0);
  }

  // Fallback: If 0 requirements extracted by LLM, extract bullet points/sentences directly from jdText
  if (validated.requirements.length === 0 && jdText.trim().length > 0) {
    const lines = jdText
      .split(/\n|;|\./)
      .map(l => l.replace(/^[\s\-*•\d.)]+/, '').trim())
      .filter(l => l.length >= 10 && l.length <= 200);

    const fallbackLines = lines.slice(0, 8);
    validated.requirements = fallbackLines.map((line, idx) => ({
      id: `r${idx + 1}`,
      text: line,
      kind: 'technical' as const,
      priority: 'must' as const,
    }));
  }

  // Ensure unique IDs
  const ids = new Set<string>();
  validated.requirements = validated.requirements.map((r, i) => {
    if (ids.has(r.id)) {
      r.id = `r${i + 1}_dedup`;
    }
    ids.add(r.id);
    return r;
  });

  return validated;
}

function validateKind(kind: string): 'technical' | 'behavioural' | 'domain' {
  const valid = ['technical', 'behavioural', 'domain'] as const;
  if (valid.includes(kind as typeof valid[number])) return kind as typeof valid[number];
  return 'technical';
}

function validatePriority(priority: string): 'must' | 'nice' {
  if (priority === 'must' || priority === 'nice') return priority;
  return 'must'; // Default to must if unclear
}
