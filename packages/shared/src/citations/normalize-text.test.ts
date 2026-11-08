import { describe, expect, it } from 'vitest';
import { normalizeText } from './normalize-text.ts';

function normalized(source: string): string {
  return normalizeText(source).text;
}

function originalSliceOf(source: string, fragment: string): string {
  const result = normalizeText(source);
  const index = result.text.indexOf(fragment);
  const start = result.sourceStart[index] ?? -1;
  const end = result.sourceEnd[index + fragment.length - 1] ?? -1;
  return source.slice(start, end);
}

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalized('Términos Y CONDICIONES')).toBe('términos y condiciones');
  });

  it('collapses spaces, tabs and line breaks into one space', () => {
    expect(normalized('one  two\t\tthree\n\nfour\r\nfive')).toBe('one two three four five');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalized('  \n terms \n ')).toBe('terms');
  });

  it('turns typographic quotes into straight quotes', () => {
    expect(normalized('“Service” and ‘content’ «here»')).toBe('"service" and \'content\' "here"');
  });

  it('turns long dashes into a simple hyphen', () => {
    expect(normalized('a – b — c − d')).toBe('a - b - c - d');
  });

  it('applies NFKC to compatibility characters', () => {
    expect(normalized('ＡＢＣ ﬁle end')).toBe('abc file end');
  });

  it('composes decomposed accents', () => {
    expect(normalized('información')).toBe(normalized('información'));
  });

  it('joins words split by a hyphen at the end of a line', () => {
    expect(normalized('la infor-\nmación personal')).toBe('la información personal');
  });

  it('joins split words when spaces surround the line break', () => {
    expect(normalized('infor- \n  mación')).toBe('información');
  });

  it('keeps hyphens that are not at the end of a line', () => {
    expect(normalized('send an e-mail')).toBe('send an e-mail');
  });

  it('keeps line end hyphens between numbers', () => {
    expect(normalized('years 2020-\n2021')).toBe('years 2020- 2021');
  });

  it('returns an empty result for empty or blank text', () => {
    expect(normalizeText('')).toEqual({ text: '', sourceStart: [], sourceEnd: [] });
    expect(normalized(' \n\t ')).toBe('');
  });

  it('keeps one source position per normalized unit', () => {
    const result = normalizeText('Uno  Dos\ninfor-\nmación');
    expect(result.sourceStart).toHaveLength(result.text.length);
    expect(result.sourceEnd).toHaveLength(result.text.length);
  });

  it('maps normalized fragments back to the original text', () => {
    const source = 'Header\n\nWe   SHARE your infor-\nmación with “partners”.';
    expect(originalSliceOf(source, 'we share your información')).toBe(
      'We   SHARE your infor-\nmación',
    );
    expect(originalSliceOf(source, '"partners"')).toBe('“partners”');
  });

  it('keeps positions aligned after characters outside the basic plane', () => {
    const source = 'Note 😀 we keep your data';
    const result = normalizeText(source);
    expect(result.sourceStart).toHaveLength(result.text.length);
    expect(originalSliceOf(source, 'we keep your data')).toBe('we keep your data');
  });

  it('maps decomposed characters to their whole original cluster', () => {
    const source = 'información';
    expect(originalSliceOf(source, 'información')).toBe(source);
  });
});
