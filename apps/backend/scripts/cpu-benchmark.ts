import { readFileSync } from 'node:fs';
import {
  analysisRequestSchema,
  CLAUSE_CATEGORIES,
  MAX_CLAUSES,
  MAX_DOCUMENT_CHARACTERS,
} from '@risklex/shared';
import { AI_PROVIDER_CONFIG } from '../src/config/ai-provider.config.ts';
import { createAnalyzeDocument } from '../src/modules/analysis/application/analyze-document.use-case.ts';
import {
  buildDocumentMessage,
  buildSystemPrompt,
} from '../src/modules/analysis/infrastructure/analysis-prompt.ts';
import type { MessagesRequestBody } from '../src/modules/analysis/infrastructure/anthropic-request.ts';
import { parseMessagesResponse } from '../src/modules/analysis/infrastructure/anthropic-response.ts';

const TARGET_MS = 5;
const WARMUP_RUNS = 50;
const MEASURED_RUNS = 200;
const PARAGRAPH =
  'El usuario acepta que la empresa podrá tratar sus datos personales, conservarlos y compartirlos con terceros de acuerdo con estas condiciones generales del servicio. ';
const SCHEMA: unknown = JSON.parse(
  readFileSync(
    new URL('../src/modules/analysis/infrastructure/model-output.schema.json', import.meta.url),
    'utf8',
  ),
);

const documentText = PARAGRAPH.repeat(Math.ceil(MAX_DOCUMENT_CHARACTERS / PARAGRAPH.length)).slice(
  0,
  MAX_DOCUMENT_CHARACTERS,
);
const input = { text: documentText, language: 'es' } as const;
const requestBytes = new TextEncoder().encode(JSON.stringify(input));

function longText(seed: string): string {
  return `${seed} ${'Explicación sencilla de lo que puede pasar si acepta esta condición. '.repeat(3)}`;
}

function worstCaseClause(index: number) {
  const assessment = (severity: 'high_risk' | 'warning') => ({
    severity,
    meaning: longText(`Significado ${String(index)}.`),
    consequence: longText(`Consecuencia ${String(index)}.`),
  });
  return {
    category: CLAUSE_CATEGORIES[index % CLAUSE_CATEGORIES.length],
    title: `Cláusula de ejemplo número ${String(index)} con un título descriptivo`,
    quote: documentText.slice(index * 1000, index * 1000 + 480),
    evidenceStatus: 'supported',
    isAmbiguous: index % 4 === 0,
    ambiguityReason: index % 4 === 0 ? longText('Término sin definir.') : '',
    confidence: 'high',
    entities: ['party', 'personal_data', 'third_party', 'time_period'].map((type) => ({
      type,
      text: `entidad ${type}`,
    })),
    profiles: {
      free_user: assessment('warning'),
      subscriber: assessment('high_risk'),
      professional: assessment('high_risk'),
    },
  };
}

const providerResponseText = JSON.stringify({
  model: 'claude-sonnet-5-5',
  stop_reason: 'end_turn',
  content: [
    { type: 'thinking', thinking: '', signature: 'simulated-signature' },
    {
      type: 'text',
      text: JSON.stringify({
        clauses: Array.from({ length: MAX_CLAUSES }, (_, index) => worstCaseClause(index)),
        glossary: Array.from({ length: 8 }, (_, index) => ({
          term: `Término ${String(index)}`,
          explanation: longText('Explicación.'),
        })),
        moreClausesLikely: true,
      }),
    },
  ],
  usage: { input_tokens: 48_600, output_tokens: 9_000 },
});

function buildRequestBody(): MessagesRequestBody {
  return {
    model: AI_PROVIDER_CONFIG.model,
    max_tokens: AI_PROVIDER_CONFIG.maxTokens,
    system: buildSystemPrompt(input.language),
    messages: [{ role: 'user', content: buildDocumentMessage(input.text) }],
    thinking: AI_PROVIDER_CONFIG.thinking,
    output_config: {
      effort: AI_PROVIDER_CONFIG.effort,
      format: { type: 'json_schema', schema: SCHEMA },
    },
  };
}

const parsedAnalysis = parseMessagesResponse(JSON.parse(providerResponseText));
const analyze = createAnalyzeDocument(
  { analyze: () => Promise.resolve(parsedAnalysis) },
  'benchmark',
);
const finalResponse = await analyze(input);

const stages: readonly [string, () => unknown][] = [
  [
    '1. decode and JSON.parse the request body',
    (): unknown => JSON.parse(new TextDecoder().decode(requestBytes)) as unknown,
  ],
  ['2. validate the request with Zod', () => analysisRequestSchema.safeParse(input)],
  ['3. build and serialize the model request', () => JSON.stringify(buildRequestBody())],
  [
    '4. parse and validate the provider response',
    () => parseMessagesResponse(JSON.parse(providerResponseText)),
  ],
  ['5. run the use case with the parsed analysis', () => analyze(input)],
  ['6. serialize the final response', () => JSON.stringify(finalResponse)],
];

async function measure(run: () => unknown): Promise<number[]> {
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    await run();
  }
  const samples: number[] = [];
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    const startedAt = performance.now();
    await run();
    samples.push(performance.now() - startedAt);
  }
  return samples.sort((left, right) => left - right);
}

function summary(samples: readonly number[]): { median: number; p95: number; max: number } {
  const at = (ratio: number): number => samples[Math.ceil(ratio * samples.length) - 1] ?? 0;
  return { median: at(0.5), p95: at(0.95), max: at(1) };
}

function line(name: string, samples: readonly number[]): string {
  const { median, p95, max } = summary(samples);
  return `${name.padEnd(48)} median ${median.toFixed(3)} ms · p95 ${p95.toFixed(3)} ms · max ${max.toFixed(3)} ms`;
}

async function main(): Promise<void> {
  console.log(
    `Simulated provider · document ${String(documentText.length)} characters · ${String(MAX_CLAUSES)} clauses · ${String(MEASURED_RUNS)} runs after ${String(WARMUP_RUNS)} warm-up runs`,
  );
  for (const [name, run] of stages) {
    console.log(line(name, await measure(run)));
  }
  const total = await measure(async () => {
    for (const [, run] of stages) {
      await run();
    }
  });
  console.log(line('total: all stages in sequence', total));
  const passes = summary(total).p95 < TARGET_MS;
  console.log(
    `Target: total p95 below ${String(TARGET_MS)} ms · ${passes ? 'PASS' : 'FAIL'} (local machine, approximation of Workers CPU)`,
  );
  process.exitCode = passes ? 0 : 1;
}

await main();
