import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readStyle(name: string): string {
  return readFileSync(new URL(`../src/renderer/src/styles/${name}`, import.meta.url), 'utf8');
}

const tokens = readStyle('tokens.css');
const base = readStyle('base.css');

type Theme = Record<string, string>;

function readTokens(block: string): Theme {
  const theme: Theme = {};
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gu)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      theme[name] = value;
    }
  }
  return theme;
}

const darkStart = tokens.indexOf('@media (prefers-color-scheme: dark)');
const LIGHT = readTokens(tokens.slice(0, darkStart));
const DARK = { ...LIGHT, ...readTokens(tokens.slice(darkStart)) };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(theme: Theme, foreground: string, background: string): number {
  const first = theme[foreground];
  const second = theme[background];
  if (first === undefined || second === undefined) {
    throw new Error(`Missing token ${foreground} or ${background}`);
  }
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

const TEXT_PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-alt'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-alt'],
  ['on-primary', 'primary'],
  ['on-accent', 'accent'],
  ['hi', 'hi-bg'],
  ['wa', 'wa-bg'],
  ['ne', 'ne-bg'],
  ['hi', 'surface'],
  ['wa', 'surface'],
  ['ne', 'surface'],
  ['on-category', 'category-privacy'],
  ['on-category', 'category-tracking'],
  ['on-category', 'category-hidden-costs'],
  ['on-category', 'category-cancellation'],
  ['on-category', 'category-content-license'],
] as const;

describe.each([
  ['light', LIGHT],
  ['dark', DARK],
])('%s theme tokens', (_name, theme) => {
  it.each(TEXT_PAIRS)('%s on %s meets WCAG AA for normal text', (foreground, background) => {
    expect(contrast(theme, foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['bg', 'surface'])('the focus ring stands out on %s', (background) => {
    expect(contrast(theme, 'focus', background)).toBeGreaterThanOrEqual(3);
  });
});

describe('design rules', () => {
  it('defines a visible focus style for every control', () => {
    expect(base).toMatch(/:focus-visible\s*\{\s*outline:\s*3px solid var\(--focus\)/u);
  });

  it('keeps decorative blobs out of the tokens', () => {
    expect(tokens).not.toMatch(/--blob/u);
  });
});
