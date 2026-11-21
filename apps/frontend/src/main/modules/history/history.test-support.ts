import type {
  VerifiedAnalysis,
  VerifiedClauseResult,
} from '../../../common/analysis-vocabulary.ts';
import type { HistoryEntry } from './domain/history-entry.ts';

const WORDS =
  'el servicio puede compartir tus datos personales con socios comerciales y anunciantes durante el tiempo que considere necesario sin aviso previo'.split(
    ' ',
  );

export function syntheticText(length: number): string {
  let text = '';
  for (let index = 0; text.length < length; index += 1) {
    text += `${text === '' ? '' : ' '}${WORDS[index % WORDS.length] ?? ''}`;
  }
  return text.slice(0, length);
}

function profile(severity: 'high_risk' | 'warning' | 'neutral') {
  return { severity, meaning: syntheticText(220), consequence: syntheticText(240) };
}

function syntheticClause(index: number, quoteLength: number): VerifiedClauseResult {
  const ambiguous = index % 3 === 0;
  return {
    clause: {
      id: `c${String(index)}`,
      category: 'privacy',
      title: syntheticText(70),
      quote: syntheticText(quoteLength),
      evidenceStatus: 'supported',
      isAmbiguous: ambiguous,
      ambiguityReason: ambiguous ? syntheticText(150) : '',
      confidence: 'high',
      entities: [{ type: 'personal_data', text: syntheticText(30) }],
      profiles: {
        free_user: profile(index % 2 === 0 ? 'high_risk' : 'warning'),
        subscriber: profile('warning'),
        professional: profile('neutral'),
      },
    },
    span: { start: index * 1000, end: index * 1000 + quoteLength },
    originalText: syntheticText(quoteLength),
  };
}

export function syntheticAnalysis(clauses = 10, quoteLength = 280): VerifiedAnalysis {
  return {
    clauses: Array.from({ length: clauses }, (_, index) => syntheticClause(index, quoteLength)),
    glossary: Array.from({ length: 6 }, () => ({
      term: syntheticText(20),
      explanation: syntheticText(160),
    })),
    meta: {
      promptVersion: '2026-11-14.1',
      model: 'claude-sonnet-5-5',
      language: 'es',
      moreClausesLikely: false,
      usage: { inputTokens: 12000, outputTokens: 4000 },
    },
    reliability: 'normal',
    totalClauses: clauses,
    discardedClauses: 0,
    attempts: 1,
  };
}

export function syntheticEntry(index: number, analysis = syntheticAnalysis()): HistoryEntry {
  const suffix = index.toString(16).padStart(12, '0');
  return {
    id: `6f1c1e9e-3b0a-4c47-9d61-${suffix}`,
    savedAt: new Date(Date.UTC(2026, 10, 21, 10, 0, index)).toISOString(),
    source: { kind: 'pdf', name: `terminos-${String(index)}.pdf` },
    characters: 48000,
    language: 'es',
    fingerprint: index.toString(16).padStart(64, '0'),
    analysis,
  };
}
