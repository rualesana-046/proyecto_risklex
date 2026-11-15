import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAX_DOCUMENT_CHARACTERS, type AnalysisResponse, type Clause } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisStage } from '../../../../common/analysis-vocabulary.ts';
import { ClientAnalysisError } from '../domain/client-analysis-error.ts';
import type { AnalysisClient } from '../infrastructure/analysis-http.client.ts';
import { runAnalysis } from './run-analysis.use-case.ts';

const EVALUATION = '../../../../../../../docs/ai-evaluation/synthetic-terms-es';
const DOCUMENT = readFileSync(fileURLToPath(new URL(`${EVALUATION}.md`, import.meta.url)), 'utf8');
const EXPECTED = JSON.parse(
  readFileSync(fileURLToPath(new URL(`${EVALUATION}.expected.json`, import.meta.url)), 'utf8'),
) as { clauses: { keyPhrase: string }[] };
const REAL_QUOTES = EXPECTED.clauses
  .map((clause) => clause.keyPhrase)
  .filter((phrase) => phrase.length >= 20);
const INVENTED_QUOTE = 'una frase que el contrato sintetico nunca contiene';

const assessment = {
  severity: 'warning',
  meaning: 'Significado.',
  consequence: 'Consecuencia.',
} as const;

function clause(quote: string, index: number): Clause {
  return {
    id: `clause-${String(index)}`,
    category: 'privacy',
    title: `Cláusula ${String(index)}`,
    quote,
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
  };
}

function response(quotes: readonly string[]): AnalysisResponse {
  return {
    result: { clauses: quotes.map(clause), glossary: [] },
    meta: {
      promptVersion: '2026-11-14.1',
      model: 'claude-sonnet-5-5',
      language: 'es',
      moreClausesLikely: false,
      usage: { inputTokens: 10, outputTokens: 5 },
    },
  };
}

function scriptedClient(...steps: (AnalysisResponse | Error)[]) {
  const analyze = vi.fn<AnalysisClient['analyze']>();
  for (const step of steps) {
    if (step instanceof Error) {
      analyze.mockRejectedValueOnce(step);
    } else {
      analyze.mockResolvedValueOnce(step);
    }
  }
  return { analyze };
}

async function run(client: AnalysisClient | null, text = DOCUMENT) {
  const stages: AnalysisStage[] = [];
  const result = await runAnalysis(
    client,
    { text, language: 'es' },
    new AbortController().signal,
    (stage) => {
      stages.push(stage);
    },
  );
  return { result, stages };
}

async function failureCode(client: AnalysisClient | null, text = DOCUMENT) {
  const error: unknown = await run(client, text).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ClientAnalysisError);
  return (error as ClientAnalysisError).code;
}

const [QUOTE_A = '', QUOTE_B = '', QUOTE_C = ''] = REAL_QUOTES;
const ALL_REAL = [QUOTE_A, QUOTE_B, QUOTE_C];
const MOSTLY_INVENTED = [QUOTE_A, INVENTED_QUOTE, `${INVENTED_QUOTE} dos`];

describe('runAnalysis (simulated client, real verification on the synthetic document)', () => {
  it('has enough real quotes in the synthetic document', () => {
    expect(REAL_QUOTES.length).toBeGreaterThanOrEqual(3);
  });

  it('verifies every quote in one attempt and reports real stages', async () => {
    const client = scriptedClient(response(ALL_REAL));
    const { result, stages } = await run(client);
    expect(client.analyze).toHaveBeenCalledOnce();
    expect(stages).toEqual(['validating', 'waiting_for_analysis', 'verifying_quotes', 'done']);
    expect(result).toMatchObject({
      reliability: 'normal',
      attempts: 1,
      totalClauses: 3,
      discardedClauses: 0,
    });
    for (const verified of result.clauses) {
      expect(verified.originalText).toBe(DOCUMENT.slice(verified.span.start, verified.span.end));
      expect(verified.originalText.toLowerCase()).toContain(
        verified.clause.quote.toLowerCase().slice(0, 10),
      );
    }
  });

  it('retries once when more than thirty percent of the quotes are discarded', async () => {
    const client = scriptedClient(response(MOSTLY_INVENTED), response(ALL_REAL));
    const { result, stages } = await run(client);
    expect(client.analyze).toHaveBeenCalledTimes(2);
    expect(stages).toEqual([
      'validating',
      'waiting_for_analysis',
      'verifying_quotes',
      'retrying',
      'verifying_quotes',
      'done',
    ]);
    expect(result).toMatchObject({ reliability: 'normal', attempts: 2, discardedClauses: 0 });
  });

  it('keeps the attempt with fewer discards and flags low reliability', async () => {
    const worse = [INVENTED_QUOTE, `${INVENTED_QUOTE} dos`, `${INVENTED_QUOTE} tres`, QUOTE_A];
    const client = scriptedClient(response(MOSTLY_INVENTED), response(worse));
    const { result } = await run(client);
    expect(result).toMatchObject({
      reliability: 'low',
      attempts: 2,
      totalClauses: 3,
      discardedClauses: 2,
    });
  });

  it('keeps the first attempt with low reliability when the retry fails', async () => {
    const client = scriptedClient(
      response(MOSTLY_INVENTED),
      new ClientAnalysisError('network_unavailable'),
    );
    const { result } = await run(client);
    expect(result).toMatchObject({ reliability: 'low', attempts: 2, discardedClauses: 2 });
  });

  it('propagates a cancellation during the retry', async () => {
    const client = scriptedClient(response(MOSTLY_INVENTED), new ClientAnalysisError('cancelled'));
    expect(await failureCode(client)).toBe('cancelled');
  });

  it('fails with low reliability when no quote can be verified', async () => {
    const invented = [INVENTED_QUOTE, `${INVENTED_QUOTE} dos`];
    expect(await failureCode(scriptedClient(response(invented), response(invented)))).toBe(
      'low_reliability',
    );
  });

  it('accepts a document without relevant clauses', async () => {
    const { result } = await run(scriptedClient(response([])));
    expect(result).toMatchObject({
      reliability: 'normal',
      clauses: [],
      totalClauses: 0,
      attempts: 1,
    });
  });

  it('wraps unknown client failures as unexpected', async () => {
    expect(await failureCode(scriptedClient(new Error('boom')))).toBe('unexpected');
  });

  it('never calls the backend without configuration or with an invalid document', async () => {
    const client = scriptedClient(response(ALL_REAL));
    expect(await failureCode(null)).toBe('configuration_missing');
    expect(await failureCode(client, '   ')).toBe('invalid_request');
    expect(await failureCode(client, 'a'.repeat(MAX_DOCUMENT_CHARACTERS + 1))).toBe(
      'document_too_large',
    );
    expect(client.analyze).not.toHaveBeenCalled();
  });
});
