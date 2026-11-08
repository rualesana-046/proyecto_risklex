export interface NormalizedText {
  readonly text: string;
  readonly sourceStart: readonly number[];
  readonly sourceEnd: readonly number[];
}

interface PendingSpace {
  start: number;
  end: number;
  hasLineBreak: boolean;
}

const COMBINING_MARK = /\p{M}/u;
const WHITESPACE = /\s/u;
const LETTER = /\p{L}/u;
const SINGLE_QUOTES = /[‘’‚‛′´]/gu;
const DOUBLE_QUOTES = /[“”„‟″«»]/gu;
const DASHES = /[‐-―−﹘﹣－]/gu;
const LINE_BREAKS = new Set(['\n', '\r', '\u0085', ' ', ' ']);
const ASCII_WHITESPACE = new Set([' ', '\t', '\n', '\r', '\f', '\v']);

function isWhitespace(unit: string): boolean {
  return ASCII_WHITESPACE.has(unit) || (unit.charCodeAt(0) > 0x7f && WHITESPACE.test(unit));
}

function isLetter(unit: string | undefined): boolean {
  return unit !== undefined && LETTER.test(unit);
}

function codePointLength(source: string, index: number): number {
  return (source.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
}

function isCombiningMark(source: string, index: number): boolean {
  const codePoint = source.codePointAt(index) ?? 0;
  return codePoint >= 0x300 && COMBINING_MARK.test(String.fromCodePoint(codePoint));
}

function clusterEnd(source: string, start: number): number {
  let end = start + codePointLength(source, start);
  while (end < source.length && isCombiningMark(source, end)) {
    end += codePointLength(source, end);
  }
  return end;
}

function canonicalize(cluster: string): string {
  if (cluster.length === 1 && cluster.charCodeAt(0) < 0x80) {
    return cluster.toLowerCase();
  }
  return cluster
    .normalize('NFKC')
    .toLowerCase()
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-');
}

class NormalizedTextBuilder {
  private readonly units: string[] = [];
  private readonly starts: number[] = [];
  private readonly ends: number[] = [];
  private pending: PendingSpace | null = null;

  push(value: string, start: number, end: number): void {
    for (let offset = 0; offset < value.length; offset += 1) {
      const unit = value.charAt(offset);
      if (isWhitespace(unit)) {
        this.addSpace(start, end, LINE_BREAKS.has(unit));
      } else {
        this.flushSpace(unit);
        this.append(unit, start, end);
      }
    }
  }

  finish(): NormalizedText {
    return { text: this.units.join(''), sourceStart: this.starts, sourceEnd: this.ends };
  }

  private addSpace(start: number, end: number, hasLineBreak: boolean): void {
    if (this.pending) {
      this.pending.end = end;
      this.pending.hasLineBreak ||= hasLineBreak;
      return;
    }
    this.pending = { start, end, hasLineBreak };
  }

  private flushSpace(next: string): void {
    const pending = this.pending;
    this.pending = null;
    if (!pending || this.units.length === 0) {
      return;
    }
    if (pending.hasLineBreak && this.endsWithSplitWord() && isLetter(next)) {
      this.units.pop();
      this.starts.pop();
      this.ends.pop();
      return;
    }
    this.append(' ', pending.start, pending.end);
  }

  private endsWithSplitWord(): boolean {
    const last = this.units.length - 1;
    return this.units[last] === '-' && isLetter(this.units[last - 1]);
  }

  private append(unit: string, start: number, end: number): void {
    this.units.push(unit);
    this.starts.push(start);
    this.ends.push(end);
  }
}

export function normalizeText(source: string): NormalizedText {
  const builder = new NormalizedTextBuilder();
  let index = 0;
  while (index < source.length) {
    const end = clusterEnd(source, index);
    builder.push(canonicalize(source.slice(index, end)), index, end);
    index = end;
  }
  return builder.finish();
}
