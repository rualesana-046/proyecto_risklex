import { readdirSync, readFileSync } from 'node:fs';
import { normalizeText } from '@risklex/shared';
import { describe, expect, it } from 'vitest';
import { PROMPT_EXAMPLES } from '../src/modules/analysis/infrastructure/analysis-prompt.ts';

const EVALUATION_DIRECTORY = new URL('../../../docs/ai-evaluation/', import.meta.url);
const MIN_SIGNIFICANT_LENGTH = 5;
const MAX_SHARED_SIGNIFICANT_WORDS = 2;
const FUNCTION_WORDS = new Set([
  'about',
  'after',
  'before',
  'being',
  'during',
  'every',
  'other',
  'their',
  'there',
  'these',
  'those',
  'under',
  'until',
  'where',
  'which',
  'while',
  'within',
  'without',
  'would',
  'could',
  'should',
]);

function words(text: string): string[] {
  return normalizeText(text)
    .text.split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

function significantWords(text: string): Set<string> {
  return new Set(
    words(text).filter(
      (word) => word.length >= MIN_SIGNIFICANT_LENGTH && !FUNCTION_WORDS.has(word),
    ),
  );
}

function trigrams(text: string): Set<string> {
  const list = words(text);
  return new Set(
    list
      .slice(0, -2)
      .map((word, index) => `${word} ${list[index + 1] ?? ''} ${list[index + 2] ?? ''}`),
  );
}

export function contamination(example: string, documentText: string): string | null {
  const documentTrigrams = trigrams(documentText);
  const sharedTrigram = [...trigrams(example)].find((trigram) => documentTrigrams.has(trigram));
  if (sharedTrigram !== undefined) {
    return `shares the sequence "${sharedTrigram}"`;
  }
  const exampleWords = significantWords(example);
  for (const sentence of documentText.split(/[.!?\n]+/u)) {
    const shared = [...significantWords(sentence)].filter((word) => exampleWords.has(word));
    if (shared.length > MAX_SHARED_SIGNIFICANT_WORDS) {
      return `shares ${shared.join(', ')} with one sentence`;
    }
  }
  return null;
}

const documents = readdirSync(EVALUATION_DIRECTORY)
  .filter((name) => name.endsWith('.md'))
  .map((name) => ({ name, text: readFileSync(new URL(name, EVALUATION_DIRECTORY), 'utf8') }));

describe('prompt examples never come from evaluation documents', () => {
  it('finds the evaluation documents', () => {
    expect(documents.length).toBeGreaterThanOrEqual(3);
  });

  it.each(PROMPT_EXAMPLES)('the example "%s" is not contaminated', (example) => {
    for (const document of documents) {
      expect({ document: document.name, issue: contamination(example, document.text) }).toEqual({
        document: document.name,
        issue: null,
      });
    }
  });

  it('detects a shared three word sequence', () => {
    expect(
      contamination('We renew the plan yearly', 'Plans renew the plan yearly.'),
    ).not.toBeNull();
  });

  it('detects three significant words shared with one sentence', () => {
    const sentence = 'Personal photos stored safely forever.';
    expect(contamination('forever photos stored', sentence)).not.toBeNull();
    expect(contamination('photos stored here', sentence)).toBeNull();
  });
});
