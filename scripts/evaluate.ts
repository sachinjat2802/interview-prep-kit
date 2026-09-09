#!/usr/bin/env node

/**
 * Batch Entry Point (Section 9)
 * 
 * Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
 * 
 * Reads an array of cases, runs the full pipeline on each,
 * and writes results in the Appendix B format.
 * 
 * Uses the SAME pipeline code as the web application.
 * No MongoDB required — runs entirely in memory.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from project root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import { runPipeline, PipelineInput } from '../server/src/services/pipeline/index.js';
import { stripInternalFields } from '../server/src/services/pipeline/validator.js';

interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

interface BatchOutput {
  version: string;
  generated_at: string;
  kits: Array<{
    id: string;
    status: 'ok' | 'failed';
    kit: unknown | null;
    error: { code: string; message: string } | null;
  }>;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let inputPath = '';
  let outputPath = '';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i];
    } else if (!args[i].startsWith('-')) {
      if (!inputPath) inputPath = args[i];
      else if (!outputPath) outputPath = args[i];
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  // Resolve paths
  inputPath = path.resolve(inputPath);
  outputPath = path.resolve(outputPath);

  // Read input
  let cases: BatchCase[];
  try {
    const raw = fs.readFileSync(inputPath, 'utf-8');
    cases = JSON.parse(raw);
    if (!Array.isArray(cases)) {
      throw new Error('Input must be a JSON array');
    }
  } catch (error) {
    console.error(`Failed to read input file: ${(error as Error).message}`);
    process.exit(1);
  }

  console.log(`Processing ${cases.length} cases...`);
  const startTime = Date.now();

  const output: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: [],
  };

  // Process each case — continue on failure
  for (const batchCase of cases) {
    console.log(`\n--- Case ${batchCase.id} ---`);
    console.log(`  JD: ${batchCase.jd.slice(0, 80)}...`);
    console.log(`  Company: ${batchCase.company_url}`);
    console.log(`  Days: ${batchCase.days}`);

    try {
      const input: PipelineInput = {
        jdText: batchCase.jd,
        companyUrl: batchCase.company_url,
        daysAvailable: batchCase.days || 5,
        allowPrivate: true, // Allow localhost for test servers
      };

      const result = await runPipeline(
        input,
        undefined,
        (step, total, msg) => {
          console.log(`  [${step}/${total}] ${msg}`);
        }
      );

      output.kits.push({
        id: batchCase.id,
        status: 'ok',
        kit: stripInternalFields(result.kit),
        error: null,
      });

      if (result.errors.length > 0) {
        console.log(`  ⚠ Completed with warnings: ${result.errors.join('; ')}`);
      } else {
        console.log('  ✓ Completed successfully');
      }

    } catch (error) {
      const message = (error as Error).message || 'Unknown error';
      console.error(`  ✗ Failed: ${message}`);

      // Determine error code
      let code = 'GENERATION_FAILED';
      if (message.includes('unreachable') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
        code = 'COMPANY_UNREACHABLE';
      } else if (message.includes('rate') || message.includes('429')) {
        code = 'RATE_LIMITED';
      } else if (message.includes('API key') || message.includes('GEMINI_API_KEY')) {
        code = 'LLM_AUTH_ERROR';
      }

      output.kits.push({
        id: batchCase.id,
        status: 'failed',
        kit: null,
        error: { code, message },
      });
    }
  }

  // Write output
  try {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✓ Output written to ${outputPath}`);
  } catch (error) {
    console.error(`Failed to write output: ${(error as Error).message}`);
    process.exit(1);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nDone in ${elapsed}s. ${output.kits.filter(k => k.status === 'ok').length}/${cases.length} succeeded.`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
