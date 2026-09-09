/**
 * Pipeline Steps — Each step is an independent class following
 * the Chain of Responsibility pattern.
 * 
 * Design decisions:
 * - Steps are ordered by their `order` property
 * - Critical steps (extraction) abort on failure
 * - Non-critical steps (research, discussion) log errors and continue
 * - Deterministic steps (coverage, scheduling) are clearly separated from LLM steps
 */

import { BasePipelineStep } from '../../core/pipeline.js';
import { KitPipelineContext } from './context.js';
import { extractRequirements } from './extractor.js';
import { researchCompany } from './researcher.js';
import { generateCompanyBrief, generateAllQuestions, generateFlashcards, fillGaps } from './generator.js';
import { checkCoverage, getUncoveredRequirements } from './coverage.js';
import { buildSchedule } from './scheduler.js';
import { repairKit, validateKit, stripInternalFields } from './validator.js';
import { domainScrapeCache } from '../../utils/cache.js';

// ─── Step 1: Extract Requirements (LLM — Critical) ───

export class ExtractRequirementsStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Analyzing job description';
  readonly order = 1;
  readonly critical = true; // Can't continue without requirements

  protected async run(ctx: KitPipelineContext): Promise<void> {
    const extracted = await extractRequirements(ctx.input.jdText, ctx.llm);
    ctx.extracted = extracted;

    // Populate builder with extracted data
    ctx.builder.setSource({
      company: extracted.company || extractCompanyName(ctx.input.companyUrl),
      company_url: ctx.input.companyUrl,
      role: extracted.title,
      location: extracted.location,
      jd_chars: ctx.input.jdText.length,
    });

    ctx.builder.setRole({
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements: extracted.requirements,
    });

    console.log(`  → Extracted ${extracted.requirements.length} requirements`);
  }
}

// ─── Step 2: Research Company (Crawl + Search — Non-critical) ───

export class ResearchCompanyStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Researching company';
  readonly order = 2;
  readonly critical = false; // Kit can still be generated without company research

  protected async run(ctx: KitPipelineContext): Promise<void> {
    const companyName = ctx.extracted?.company || extractCompanyName(ctx.input.companyUrl);
    const cacheKey = `research:${ctx.input.companyUrl.toLowerCase()}`;
    let research = domainScrapeCache.get(cacheKey) as import('./researcher.js').ResearchBundle | null;

    if (!research) {
      research = await researchCompany(
        ctx.input.companyUrl,
        companyName,
        { allowPrivate: ctx.input.allowPrivate }
      );
      domainScrapeCache.set(cacheKey, research);
    } else {
      console.log(`  → Cache hit for domain research: ${ctx.input.companyUrl}`);
    }

    ctx.research = research;

    // Record pages used
    ctx.builder.setSource({ pages_used: research.allSources });

    if (research.crawl.errors.length > 0) {
      ctx.errors.push(...research.crawl.errors.map((crawlError: string) => `Crawl: ${crawlError}`));
    }

    console.log(`  → Crawled ${research.crawl.pages.length} pages, ` +
      `hiring page ${research.crawl.hiringPage ? 'found' : 'not found'}`);
  }
}

// ─── Step 3: Generate Company Brief (LLM — Non-critical) ───

export class GenerateCompanyBriefStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Generating company brief';
  readonly order = 3;
  readonly critical = false;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    const content = ctx.research?.combinedContent || '';
    const brief = await generateCompanyBrief(ctx.input.companyUrl, content, ctx.llm);

    ctx.builder.setCompanyBrief({
      ...brief,
      sources: ctx.research?.allSources || [],
    });

    console.log(`  → Brief generated (${brief.summary.length} chars)`);
  }
}

// ─── Step 4: Generate Questions by Category (LLM — Non-critical) ───

export class GenerateQuestionsStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Generating interview questions';
  readonly order = 4;
  readonly critical = false;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    if (!ctx.extracted) throw new Error('Requirements not extracted');

    const briefStr = (() => {
      const current = ctx.builder.current();
      return `${current.company_brief?.summary || ''} ${current.company_brief?.what_they_do || ''}`;
    })();

    const roleTitle = ctx.extracted.title || ctx.builder.current().role?.title || 'Job Position';
    const hiringInfo = ctx.research?.hiringContent || '';

    const questions = await generateAllQuestions(
      ctx.extracted.requirements,
      briefStr,
      hiringInfo,
      ctx.input.daysAvailable,
      ctx.llm,
      roleTitle
    );

    ctx.questions = questions;
    console.log(`  → Generated ${questions.length} questions across categories`);
  }
}

// ─── Step 5: Generate Flashcards (LLM — Non-critical) ───

export class GenerateFlashcardsStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Creating flashcards';
  readonly order = 5;
  readonly critical = false;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    if (!ctx.extracted) throw new Error('Requirements not extracted');

    const roleTitle = ctx.extracted.title || ctx.builder.current().role?.title || 'Job Position';

    const flashcards = await generateFlashcards(
      ctx.extracted.requirements,
      ctx.questions,
      ctx.input.daysAvailable,
      ctx.llm,
      roleTitle
    );

    ctx.flashcards = flashcards;
    console.log(`  → Generated ${flashcards.length} flashcards`);
  }
}

// ─── Step 6: Coverage Check + Gap Fill (DETERMINISTIC check + LLM fill) ───

export class CoverageCheckStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Checking coverage & filling gaps';
  readonly order = 6;
  readonly critical = false;

  private readonly maxPasses = 3;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    if (!ctx.extracted) throw new Error('Requirements not extracted');

    let passes = 1;
    let coverageResult = checkCoverage(ctx.extracted.requirements, ctx.questions);

    console.log(`  → Pass ${passes}: ${coverageResult.uncovered_requirement_ids.length} uncovered must-haves`);

    // Coverage loop — deterministic check, LLM-powered gap fill
    while (!coverageResult.allCovered && passes < this.maxPasses) {
      passes++;

      const uncovered = getUncoveredRequirements(
        ctx.extracted.requirements,
        coverageResult.uncovered_requirement_ids
      );

      console.log(`  → Pass ${passes}: filling ${uncovered.length} gaps`);

      const gapFill = await fillGaps(uncovered as unknown as import('./generator.js').Requirement[], ctx.questions.length, ctx.llm);
      ctx.questions.push(...gapFill.questions);
      ctx.flashcards.push(...gapFill.flashcards);

      coverageResult = checkCoverage(ctx.extracted.requirements, ctx.questions);
      console.log(`  → Pass ${passes}: ${coverageResult.uncovered_requirement_ids.length} still uncovered`);
    }

    // Store coverage result
    ctx.data.uncoveredIds = coverageResult.uncovered_requirement_ids;
    ctx.data.coveragePasses = passes;
  }
}

// ─── Step 7: Build Schedule (DETERMINISTIC — No LLM) ───

export class BuildScheduleStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Building study schedule';
  readonly order = 7;
  readonly critical = false;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    const requirements = ctx.extracted?.requirements || [];
    ctx.questions = ctx.questions || [];

    const schedule = buildSchedule(
      ctx.questions.map(q => ({
        id: q.id,
        requirement_ids: q.requirement_ids,
        category: q.category,
        difficulty: q.difficulty,
      })),
      requirements.map(r => ({ id: r.id, priority: r.priority })),
      ctx.input.daysAvailable
    );

    ctx.builder.setSchedule(schedule);
    console.log(`  → ${schedule.days.length}-day schedule created`);
  }
}

// ─── Step 8: Assemble & Validate Kit (DETERMINISTIC) ───

export class AssembleKitStep extends BasePipelineStep<KitPipelineContext> {
  readonly name = 'Validating kit structure';
  readonly order = 8;
  readonly critical = false;

  protected async run(ctx: KitPipelineContext): Promise<void> {
    // Assemble final kit via builder
    ctx.builder
      .setQuestions(ctx.questions as unknown as import('./validator.js').KitStructure['questions'])
      .setFlashcards(ctx.flashcards as unknown as import('./validator.js').KitStructure['flashcards'])
      .setCoverage({
        uncovered_requirement_ids: (ctx.data.uncoveredIds as string[]) || [],
        passes: (ctx.data.coveragePasses as number) || 1,
      })
      .setSource({ researched_at: new Date().toISOString() });

    // Repair any structural issues
    const rawKit = ctx.builder.build();
    const repaired = repairKit(rawKit);

    // Validate
    const validation = validateKit(repaired);
    if (!validation.valid) {
      console.warn('  ⚠ Kit validation issues:', validation.errors);
      ctx.errors.push(...validation.errors.map(validationError => `Validation: ${validationError}`));
    }

    // Store final kit in context
    ctx.data.kit = stripInternalFields(repaired);
    console.log('  → Kit assembled and validated');
  }
}

// ─── Helpers ───

function extractCompanyName(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return '';
  }
}
