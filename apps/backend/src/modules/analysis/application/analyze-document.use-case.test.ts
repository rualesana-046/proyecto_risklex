import { analysisResponseSchema, MAX_CLAUSES } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import { AnalysisError } from '../domain/analysis-error.ts';
import type { LanguageModel, ModelAnalysis, ModelClause } from '../domain/language-model.port.ts';
import { createAnalyzeDocument } from './analyze-document.use-case.ts';

const assessment = {
  severity: 'warning',
  meaning: 'Meaning.',
  consequence: 'Consequence.',
} as const;

function clause(overrides: Partial<ModelClause> = {}): ModelClause {
  return {
    category: 'privacy',
    title: 'Shares data',
    quote: 'We may share personal information with partners.',
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
    ...overrides,
  };
}

function analysis(overrides: Partial<ModelAnalysis> = {}): ModelAnalysis {
  return {
    model: 'claude-sonnet-5-5',
    clauses: [clause()],
    glossary: [{ term: 'Sublicense', explanation: 'Let others use it.' }],
    moreClausesLikely: false,
    usage: { inputTokens: 1000, outputTokens: 500 },
    ...overrides,
  };
}

function simulatedModel(result: ModelAnalysis | AnalysisError): LanguageModel {
  return {
    analyze: () =>
      result instanceof AnalysisError ? Promise.reject(result) : Promise.resolve(result),
  };
}

const input = { text: 'Terms of service.', language: 'en' } as const;

describe('createAnalyzeDocument (simulated model)', () => {
  it('returns a response that matches the shared contract', async () => {
    const response = await createAnalyzeDocument(simulatedModel(analysis()), 'v1')(input);
    expect(analysisResponseSchema.safeParse(response).success).toBe(true);
    expect(response.meta).toEqual({
      promptVersion: 'v1',
      model: 'claude-sonnet-5-5',
      language: 'en',
      moreClausesLikely: false,
      usage: { inputTokens: 1000, outputTokens: 500 },
    });
  });

  it('assigns sequential ids to the valid clauses', async () => {
    const model = simulatedModel(
      analysis({ clauses: [clause(), clause({ quote: 'short' }), clause()] }),
    );
    const response = await createAnalyzeDocument(model, 'v1')(input);
    expect(response.result.clauses.map((item) => item.id)).toEqual(['clause-1', 'clause-2']);
  });

  it.each([
    ['a quote shorter than 20 characters', { quote: 'Too short' }],
    ['an empty title', { title: '  ' }],
    ['an ambiguous clause without a reason', { isAmbiguous: true, ambiguityReason: '' }],
  ])('drops a clause with %s', async (_label, overrides) => {
    const model = simulatedModel(analysis({ clauses: [clause(overrides)] }));
    expect((await createAnalyzeDocument(model, 'v1')(input)).result.clauses).toEqual([]);
  });

  it('drops empty glossary terms', async () => {
    const model = simulatedModel(analysis({ glossary: [{ term: ' ', explanation: 'x' }] }));
    expect((await createAnalyzeDocument(model, 'v1')(input)).result.glossary).toEqual([]);
  });

  it('cuts the result to the maximum and flags that more clauses exist', async () => {
    const clauses = Array.from({ length: MAX_CLAUSES + 2 }, () => clause());
    const response = await createAnalyzeDocument(
      simulatedModel(analysis({ clauses })),
      'v1',
    )(input);
    expect(response.result.clauses).toHaveLength(MAX_CLAUSES);
    expect(response.meta.moreClausesLikely).toBe(true);
  });

  it('keeps the flag when the model says more clauses exist', async () => {
    const model = simulatedModel(analysis({ moreClausesLikely: true }));
    expect((await createAnalyzeDocument(model, 'v1')(input)).meta.moreClausesLikely).toBe(true);
  });

  it('calls the model once and passes provider errors through', async () => {
    let calls = 0;
    const model: LanguageModel = {
      analyze: () => {
        calls += 1;
        return Promise.reject(new AnalysisError('provider_refusal'));
      },
    };
    await expect(createAnalyzeDocument(model, 'v1')(input)).rejects.toMatchObject({
      code: 'provider_refusal',
    });
    expect(calls).toBe(1);
  });
});
