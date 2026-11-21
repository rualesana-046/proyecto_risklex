import type { AnalysisLanguage, AnalysisResponse } from '@risklex/shared';

export interface AddressOccurrence {
  readonly field: string;
  readonly context: string;
}

export interface AddressReport {
  readonly applies: boolean;
  readonly counted: readonly AddressOccurrence[];
  readonly quoted: readonly AddressOccurrence[];
}

const FORMAL_WORD = /(?<!\p{L})ustede?s?(?!\p{L})/giu;
const QUOTED_SPANS = [/«[^»]*»/gu, /“[^”]*”/gu, /"[^"]*"/gu];
const CONTEXT_WORDS = 4;

interface Field {
  readonly field: string;
  readonly text: string;
}

function explanationFields(response: AnalysisResponse): Field[] {
  const clauses = response.result.clauses.flatMap((clause, index) => {
    const prefix = `clause ${String(index + 1)}`;
    const profiles = Object.entries(clause.profiles).flatMap(([profile, assessment]) => [
      { field: `${prefix} · ${profile} meaning`, text: assessment.meaning },
      { field: `${prefix} · ${profile} consequence`, text: assessment.consequence },
    ]);
    return [
      { field: `${prefix} · title`, text: clause.title },
      { field: `${prefix} · ambiguityReason`, text: clause.ambiguityReason },
      ...profiles,
    ];
  });
  const glossary = response.result.glossary.flatMap((term, index) => [
    { field: `glossary ${String(index + 1)} · term`, text: term.term },
    { field: `glossary ${String(index + 1)} · explanation`, text: term.explanation },
  ]);
  return [...clauses, ...glossary];
}

function insideQuotes(text: string, index: number): boolean {
  return QUOTED_SPANS.some((pattern) =>
    [...text.matchAll(pattern)].some(
      (span) => index > span.index && index < span.index + span[0].length,
    ),
  );
}

function contextAround(text: string, index: number, length: number): string {
  const before = text.slice(0, index).trimEnd().split(/\s+/u).slice(-CONTEXT_WORDS).join(' ');
  const after = text
    .slice(index + length)
    .trimStart()
    .split(/\s+/u)
    .slice(0, CONTEXT_WORDS)
    .join(' ');
  return `…${before} ${text.slice(index, index + length)} ${after}…`;
}

export function formalAddressReport(
  response: AnalysisResponse,
  language: AnalysisLanguage,
): AddressReport {
  if (language !== 'es') {
    return { applies: false, counted: [], quoted: [] };
  }
  const counted: AddressOccurrence[] = [];
  const quoted: AddressOccurrence[] = [];
  for (const { field, text } of explanationFields(response)) {
    for (const match of text.matchAll(FORMAL_WORD)) {
      const occurrence = { field, context: contextAround(text, match.index, match[0].length) };
      (insideQuotes(text, match.index) ? quoted : counted).push(occurrence);
    }
  }
  return { applies: true, counted, quoted };
}
