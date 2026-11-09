import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  analysisResponseSchema,
  apiErrorResponseSchema,
  APP_VERSION_HEADER,
  INSTALL_ID_HEADER,
} from '@risklex/shared';
import { z } from 'zod';
import { AI_PROVIDER_CONFIG } from '../src/config/ai-provider.config.ts';
import {
  evaluate,
  expectedSchema,
  type Expected,
  type LiveEvaluation,
} from './live-check-evaluation.ts';

const PER_RUN_CAP_USD = 0.5;
const SESSION_CAP_USD = 3;
const PROMPT_OVERHEAD_TOKENS = 4000;
const CHARACTERS_PER_TOKEN = 3;
const CLIENT_TIMEOUT_MS = (2 * AI_PROVIDER_CONFIG.timeoutSeconds + 15) * 1000;
const REPOSITORY_ROOT = new URL('../../../', import.meta.url);
const SCHEMA_FILE = new URL(
  '../src/modules/analysis/infrastructure/model-output.schema.json',
  import.meta.url,
);
const LEDGER_FILE = join(tmpdir(), `risklex-ai-live-${new Date().toISOString().slice(0, 10)}.json`);

function readOptions(): { name: string; baseUrl: string; confirm: boolean } {
  const { values } = parseArgs({
    options: {
      document: { type: 'string', default: 'synthetic-terms-es' },
      'base-url': { type: 'string', default: 'http://localhost:8787' },
      confirm: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (!/^[a-z0-9-]+$/u.test(values.document)) {
    throw new Error('The document name may only contain lowercase letters, digits and hyphens.');
  }
  return {
    name: values.document,
    baseUrl: values['base-url'],
    confirm: values.confirm && !values['dry-run'],
  };
}

function usd(inputTokens: number, outputTokens: number): number {
  const { inputUsdPerMillionTokens, outputUsdPerMillionTokens } = AI_PROVIDER_CONFIG.pricing;
  return (inputTokens * inputUsdPerMillionTokens + outputTokens * outputUsdPerMillionTokens) / 1e6;
}

function estimateCapUsd(text: string): number {
  const schemaTokens = Math.ceil(statSync(SCHEMA_FILE).size / CHARACTERS_PER_TOKEN);
  const documentTokens = Math.ceil(text.length / CHARACTERS_PER_TOKEN);
  return usd(documentTokens + PROMPT_OVERHEAD_TOKENS + schemaTokens, AI_PROVIDER_CONFIG.maxTokens);
}

function readLedgerUsd(): number {
  if (!existsSync(LEDGER_FILE)) {
    return 0;
  }
  const raw: unknown = JSON.parse(readFileSync(LEDGER_FILE, 'utf8'));
  return z.object({ spentUsd: z.number().nonnegative() }).parse(raw).spentUsd;
}

function writeLedgerUsd(spentUsd: number): void {
  writeFileSync(LEDGER_FILE, JSON.stringify({ spentUsd }));
}

async function callWorker(baseUrl: string, text: string, language: string) {
  const startedAt = performance.now();
  const response = await fetch(new URL('/v1/analyses', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [INSTALL_ID_HEADER]: crypto.randomUUID(),
      [APP_VERSION_HEADER]: '0.1.0',
    },
    body: JSON.stringify({ text, language }),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  const json: unknown = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    json,
    latencyMs: performance.now() - startedAt,
  };
}

function printEvaluation(result: LiveEvaluation, moreClausesLikely: boolean): void {
  const ellipsis = result.reasons.filter((reason) => reason === 'ellipsis').length;
  const lowReliability = result.reasons.length / Math.max(result.returned, 1) > 0.3;
  console.log(
    [
      `Clauses returned: ${String(result.returned)} · verified: ${String(result.verified)} · discarded: ${String(result.reasons.length)}`,
      `Discard reasons: ${result.reasons.length === 0 ? 'none' : result.reasons.join(', ')}`,
      `Discarded by ellipsis: ${String(ellipsis)}`,
      `Low reliability (more than 30 % discarded): ${String(lowReliability)}`,
      `Planted clauses detected: ${String(result.detected)} of ${String(result.planted)}`,
      `Severity matches: ${String(result.severityHits)} of ${String(result.detected * 3)}`,
      `Ambiguity matches: ${String(result.ambiguityHits)} of ${String(result.detected)}`,
      `Clauses built from forbidden phrases: ${String(result.forbidden)}`,
      `moreClausesLikely: ${String(moreClausesLikely)}`,
    ].join('\n'),
  );
}

function loadDocument(name: string): { text: string; expected: Expected } {
  const base = new URL(`docs/ai-evaluation/${name}`, REPOSITORY_ROOT);
  const text = readFileSync(`${base.pathname}.md`, 'utf8');
  const raw: unknown = JSON.parse(readFileSync(`${base.pathname}.expected.json`, 'utf8'));
  return { text, expected: expectedSchema.parse(raw) };
}

function printPlan(name: string, text: string, capUsd: number, spentUsd: number): void {
  console.log(
    [
      `Document: ${name} · ${String(text.length)} characters`,
      `Model ${AI_PROVIDER_CONFIG.model} · effort ${AI_PROVIDER_CONFIG.effort} · max_tokens ${String(AI_PROVIDER_CONFIG.maxTokens)}`,
      `Estimated cost cap for this run: ${capUsd.toFixed(4)} USD (limit ${String(PER_RUN_CAP_USD)})`,
      `Estimated spend today: ${spentUsd.toFixed(4)} USD (limit ${String(SESSION_CAP_USD)}) · ledger ${LEDGER_FILE}`,
    ].join('\n'),
  );
}

async function runConfirmed(
  baseUrl: string,
  document: { text: string; expected: Expected },
  capUsd: number,
  spentUsd: number,
): Promise<void> {
  const result = await callWorker(baseUrl, document.text, document.expected.language);
  console.log(`HTTP ${String(result.status)} in ${(result.latencyMs / 1000).toFixed(1)} s`);
  if (!result.ok) {
    writeLedgerUsd(spentUsd + capUsd);
    const error = apiErrorResponseSchema.safeParse(result.json);
    console.log(`Error code: ${error.success ? error.data.error.code : 'unrecognized response'}`);
    process.exitCode = 1;
    return;
  }
  const response = analysisResponseSchema.parse(result.json);
  const { inputTokens, outputTokens } = response.meta.usage;
  const costUsd = usd(inputTokens, outputTokens);
  writeLedgerUsd(spentUsd + costUsd);
  console.log(
    `Tokens: input ${String(inputTokens)} · output ${String(outputTokens)} · estimated cost ${costUsd.toFixed(4)} USD`,
  );
  printEvaluation(
    evaluate(response, document.text, document.expected),
    response.meta.moreClausesLikely,
  );
}

async function main(): Promise<void> {
  const options = readOptions();
  const document = loadDocument(options.name);
  const capUsd = estimateCapUsd(document.text);
  const spentUsd = readLedgerUsd();
  printPlan(options.name, document.text, capUsd, spentUsd);
  if (capUsd > PER_RUN_CAP_USD || spentUsd + capUsd > SESSION_CAP_USD) {
    console.log('Aborted: the estimated cost exceeds a cap. No request was sent.');
    process.exitCode = 1;
    return;
  }
  if (!options.confirm) {
    console.log('Dry run: no request was sent. Add --confirm to call the local Worker.');
    return;
  }
  await runConfirmed(options.baseUrl, document, capUsd, spentUsd);
}

await main();
