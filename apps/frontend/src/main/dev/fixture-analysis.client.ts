import {
  CLAUSE_CATEGORIES,
  MAX_QUOTE_CHARACTERS,
  MIN_QUOTE_CHARACTERS,
  SEVERITIES,
  type AnalysisResponse,
  type Clause,
} from '@risklex/shared';
import * as z from 'zod';
import expectedSample from '../../../../../docs/ai-evaluation/synthetic-terms-es.expected.json';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import type { AnalysisClient } from '../modules/analysis/infrastructure/analysis-http.client.ts';

export const FIXTURE_MODEL = 'fixture';
export const FIXTURE_PROMPT_VERSION = 'risklex-development-fixture';
const FIXTURE_DELAY_MS = 1500;

function expectedSchema() {
  const severity = z.enum(SEVERITIES);
  return z.object({
    clauses: z.array(
      z.object({
        category: z.enum(CLAUSE_CATEGORIES),
        keyPhrase: z.string(),
        isAmbiguous: z.boolean(),
        expectedSeverity: z.object({
          free_user: severity,
          subscriber: severity,
          professional: severity,
        }),
      }),
    ),
  });
}

function fixtureClauses(): Clause[] {
  const { clauses } = expectedSchema().parse(expectedSample);
  return clauses
    .filter(
      ({ keyPhrase }) =>
        keyPhrase.length >= MIN_QUOTE_CHARACTERS && keyPhrase.length <= MAX_QUOTE_CHARACTERS,
    )
    .map((entry, index) => {
      const assessment = (severity: Clause['profiles']['free_user']['severity']) => ({
        severity,
        meaning: entry.keyPhrase,
        consequence: entry.keyPhrase,
      });
      return {
        id: `fixture-${String(index + 1)}`,
        category: entry.category,
        title: entry.keyPhrase,
        quote: entry.keyPhrase,
        evidenceStatus: 'supported',
        isAmbiguous: entry.isAmbiguous,
        ambiguityReason: entry.isAmbiguous ? entry.keyPhrase : '',
        confidence: 'medium',
        entities: [],
        profiles: {
          free_user: assessment(entry.expectedSeverity.free_user),
          subscriber: assessment(entry.expectedSeverity.subscriber),
          professional: assessment(entry.expectedSeverity.professional),
        },
      };
    });
}

export function fixtureResponse(): AnalysisResponse {
  return {
    result: { clauses: fixtureClauses(), glossary: [] },
    meta: {
      promptVersion: FIXTURE_PROMPT_VERSION,
      model: FIXTURE_MODEL,
      language: 'es',
      moreClausesLikely: true,
      usage: { inputTokens: 0, outputTokens: 0 },
    },
  };
}

function waitFor(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ClientAnalysisError('cancelled'));
      return;
    }
    const timer = setTimeout(resolve, delayMs);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new ClientAnalysisError('cancelled'));
      },
      { once: true },
    );
  });
}

export function createFixtureAnalysisClient(delayMs = FIXTURE_DELAY_MS): AnalysisClient {
  return {
    analyze: async (_request, signal) => {
      await waitFor(delayMs, signal);
      return fixtureResponse();
    },
  };
}
