import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { AnalysisResponse } from '@risklex/shared';
import { describe, expect, it, vi } from 'vitest';
import { expectedSchema } from './live-check-evaluation.ts';
import {
  loadSavedResponse,
  reportResponse,
  RESULTS_DIRECTORY,
  saveResponse,
} from './live-check-results.ts';

const response: AnalysisResponse = {
  result: { clauses: [], glossary: [] },
  meta: {
    promptVersion: '2026-11-08.1',
    model: 'claude-sonnet-5-5',
    language: 'es',
    moreClausesLikely: false,
    usage: { inputTokens: 2955, outputTokens: 3381 },
  },
};

function temporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), 'risklex-live-results-test-'));
}

describe('saveResponse and loadSavedResponse', () => {
  it('round trips a response with its document name and date', () => {
    const path = saveResponse(
      temporaryDirectory(),
      'synthetic-terms-es',
      response,
      new Date('2026-11-14T10:20:30.000Z'),
    );
    expect(loadSavedResponse(path)).toEqual({
      document: 'synthetic-terms-es',
      savedAt: '2026-11-14T10:20:30.000Z',
      response,
    });
  });

  it('uses a file name that is valid on Windows, macOS and Linux', () => {
    const path = saveResponse(
      temporaryDirectory(),
      'synthetic-terms-es',
      response,
      new Date('2026-11-14T10:20:30.000Z'),
    );
    expect(basename(path)).toBe('synthetic-terms-es-2026-11-14T10-20-30-000Z.json');
  });

  it('stores only the document name, the date and the validated response', () => {
    const path = saveResponse(temporaryDirectory(), 'synthetic-terms-es', response);
    const stored = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(['document', 'response', 'savedAt']);
    const text = readFileSync(path, 'utf8').toLowerCase();
    for (const forbidden of ['x-api-key', 'anthropic-version', 'authorization', 'api_key']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('rejects a file that does not match the saved response format', () => {
    const path = join(temporaryDirectory(), 'tampered.json');
    writeFileSync(path, JSON.stringify({ document: '../secrets', savedAt: 'yesterday', response }));
    expect(() => loadSavedResponse(path)).toThrow();
  });

  it('keeps results inside the ignored backend folder', () => {
    expect(RESULTS_DIRECTORY.replaceAll('\\', '/')).toMatch(/apps\/backend\/\.live-results\/$/u);
  });
});

describe('reportResponse', () => {
  it('lists returned clauses that match no planted clause', () => {
    const text = 'Estos términos se rigen por las leyes del país en el que usted reside.';
    const assessment = {
      severity: 'neutral',
      meaning: 'Meaning.',
      consequence: 'Consequence.',
    } as const;
    const unplanted: AnalysisResponse = {
      ...response,
      result: {
        glossary: [],
        clauses: [
          {
            id: 'clause-1',
            category: 'cancellation',
            title: 'Ley aplicable',
            quote: 'se rigen por las leyes del país en el que usted reside',
            evidenceStatus: 'supported',
            isAmbiguous: false,
            ambiguityReason: '',
            confidence: 'high',
            entities: [],
            profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
          },
        ],
      },
    };
    const expected = expectedSchema.parse({ language: 'es', clauses: [], forbiddenPhrases: [] });
    const printed: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      printed.push(String(line));
    });
    reportResponse(unplanted, { text, expected }, false);
    spy.mockRestore();
    const output = printed.join('\n');
    expect(output).toContain('Clauses not matching any planted clause (review manually): 1');
    expect(output).toContain(
      'cancellation · free_user neutral, subscriber neutral, professional neutral · quote verified: true',
    );
    expect(output).not.toContain('Ley aplicable');
  });
});
