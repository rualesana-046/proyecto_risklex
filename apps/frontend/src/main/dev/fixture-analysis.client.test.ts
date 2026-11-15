import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifiedAnalysisSchema } from '../../common/ipc-schemas.ts';
import { runAnalysis } from '../modules/analysis/application/run-analysis.use-case.ts';
import { ClientAnalysisError } from '../modules/analysis/domain/client-analysis-error.ts';
import { createFixtureAnalysisClient, fixtureResponse } from './fixture-analysis.client.ts';

const EVALUATION = '../../../../../docs/ai-evaluation/synthetic-terms-es';
const SAMPLE = readFileSync(new URL(`${EVALUATION}.md`, import.meta.url), 'utf8');
const EXPECTED = JSON.parse(
  readFileSync(new URL(`${EVALUATION}.expected.json`, import.meta.url), 'utf8'),
) as {
  clauses: { keyPhrase: string }[];
};
const KEY_PHRASES = new Set(EXPECTED.clauses.map((clause) => clause.keyPhrase));

afterEach(() => {
  vi.restoreAllMocks();
});

function analyze(text: string) {
  return runAnalysis(
    createFixtureAnalysisClient(0),
    { text, language: 'es' },
    new AbortController().signal,
    () => undefined,
  );
}

describe('development fixture client', () => {
  it('never calls fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await createFixtureAnalysisClient(0).analyze(
      { text: SAMPLE, language: 'es' },
      new AbortController().signal,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is built only from the synthetic document phrases and marks itself as a fixture', () => {
    const response = fixtureResponse();
    expect(response.meta.model).toBe('fixture');
    expect(response.result.clauses.length).toBeGreaterThan(0);
    for (const clause of response.result.clauses) {
      expect(KEY_PHRASES.has(clause.quote)).toBe(true);
      expect(clause.title).toBe(clause.quote);
      expect(SAMPLE).toContain(clause.quote);
    }
  });

  it('passes the real quote verification and the real ipc validation with the sample text', async () => {
    const analysis = await analyze(SAMPLE);
    expect(analysis).toMatchObject({ reliability: 'normal', discardedClauses: 0 });
    expect(verifiedAnalysisSchema.safeParse(analysis).success).toBe(true);
  });

  it('behaves like the real flow when the text is not the sample', async () => {
    const error: unknown = await analyze(
      'Un contrato distinto que no contiene ninguna de las frases.',
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ClientAnalysisError);
    expect((error as ClientAnalysisError).code).toBe('low_reliability');
  });

  it('discards the quotes that are missing from an edited sample', async () => {
    const firstPhrase = fixtureResponse().result.clauses[0]?.quote ?? '';
    const edited = SAMPLE.replaceAll(firstPhrase, 'texto cambiado');
    const analysis = await analyze(edited);
    expect(analysis.discardedClauses).toBeGreaterThan(0);
    expect(analysis.clauses.some((item) => item.clause.quote === firstPhrase)).toBe(false);
  });

  it('can be cancelled like a real request', async () => {
    const controller = new AbortController();
    const pending = createFixtureAnalysisClient(10_000).analyze(
      { text: SAMPLE, language: 'es' },
      controller.signal,
    );
    controller.abort();
    const error: unknown = await pending.catch((caught: unknown) => caught);
    expect((error as ClientAnalysisError).code).toBe('cancelled');
  });
});
