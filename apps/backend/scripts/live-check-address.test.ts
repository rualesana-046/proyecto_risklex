import type { AnalysisResponse, Clause } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import { formalAddressReport } from './live-check-address.ts';
import { addressPass } from './live-check-criteria.ts';

function clause(meaning: string, quote = 'Cita literal del documento sintético.'): Clause {
  const assessment = {
    severity: 'warning' as const,
    meaning,
    consequence: 'Podrías perder datos.',
  };
  return {
    id: 'c1',
    category: 'privacy',
    title: 'Comparten tus datos',
    quote,
    evidenceStatus: 'supported',
    isAmbiguous: false,
    ambiguityReason: '',
    confidence: 'high',
    entities: [],
    profiles: { free_user: assessment, subscriber: assessment, professional: assessment },
  };
}

function response(clauses: Clause[], glossary: { term: string; explanation: string }[] = []) {
  const value: AnalysisResponse = {
    result: { clauses, glossary },
    meta: {
      promptVersion: '2026-11-21.1',
      model: 'm',
      language: 'es',
      moreClausesLikely: false,
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
  return value;
}

describe('formal address in the explanations', () => {
  it('counts usted outside quotes, with a few words of context', () => {
    const report = formalAddressReport(
      response([clause('La empresa puede usar los datos que usted sube a la app.')]),
      'es',
    );
    expect(report.counted).toHaveLength(3);
    expect(report.counted[0]).toEqual({
      field: 'clause 1 · free_user meaning',
      context: '…usar los datos que usted sube a la app.…',
    });
    expect(addressPass(report)).toBe(false);
  });

  it.each([
    ['angle quotes', 'El documento dice «usted acepta los cambios» sin avisarte.'],
    ['curly quotes', 'El documento dice “usted acepta los cambios” sin avisarte.'],
    ['straight quotes', 'El documento dice "usted acepta los cambios" sin avisarte.'],
  ])('reports usted inside %s without failing', (_label, meaning) => {
    const report = formalAddressReport(response([clause(meaning)]), 'es');
    expect(report.counted).toEqual([]);
    expect(report.quoted).toHaveLength(3);
    expect(addressPass(report)).toBe(true);
  });

  it('ignores the literal quote of the clause and words that only contain the letters', () => {
    const report = formalAddressReport(
      response([
        clause(
          'Tus datos se comparten con anunciantes ajustados a ti.',
          'Usted acepta que compartamos sus datos.',
        ),
      ]),
      'es',
    );
    expect(report.counted).toEqual([]);
    expect(report.quoted).toEqual([]);
  });

  it('checks the glossary and counts ustedes', () => {
    const report = formalAddressReport(
      response(
        [clause('Puedes cancelar.')],
        [{ term: 'Sublicencia', explanation: 'Permite que otros usen lo que ustedes publican.' }],
      ),
      'es',
    );
    expect(report.counted.map((occurrence) => occurrence.field)).toEqual([
      'glossary 1 · explanation',
    ]);
  });

  it('does not apply to documents in English', () => {
    const report = formalAddressReport(response([clause('Usted is not an English word.')]), 'en');
    expect(report).toEqual({ applies: false, counted: [], quoted: [] });
    expect(addressPass(report)).toBe(true);
  });
});
