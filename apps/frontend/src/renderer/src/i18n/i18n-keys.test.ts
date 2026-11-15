import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';

type Messages = { readonly [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      entries.set(path, value);
    } else {
      for (const [nested, text] of flatten(value, path)) {
        entries.set(nested, text);
      }
    }
  }
  return entries;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/gu)].map((match) => match[1] ?? '').sort();
}

const SPANISH = flatten(es);
const ENGLISH = flatten(en);

describe('translation files', () => {
  it('have exactly the same keys in Spanish and English', () => {
    expect([...ENGLISH.keys()].sort()).toEqual([...SPANISH.keys()].sort());
  });

  it.each([...SPANISH.keys()])('has non empty texts and the same placeholders for %s', (key) => {
    const spanish = SPANISH.get(key) ?? '';
    const english = ENGLISH.get(key) ?? '';
    expect(spanish.trim()).not.toBe('');
    expect(english.trim()).not.toBe('');
    expect(placeholders(english)).toEqual(placeholders(spanish));
  });
});
