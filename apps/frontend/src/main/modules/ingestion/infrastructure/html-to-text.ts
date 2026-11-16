import { TextDecoder } from 'node:util';
import { Parser } from 'htmlparser2';

const SKIPPED = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'object',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'button',
  'select',
  'textarea',
]);
const BLOCKS = new Set([
  'title',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'td',
  'th',
  'blockquote',
  'pre',
  'dd',
  'dt',
  'div',
  'section',
  'article',
  'main',
  'br',
  'tr',
  'figcaption',
  'caption',
]);
const APP_ROOTS = new Set(['root', 'app', '__next', '__nuxt', 'svelte']);
const SNIFF_BYTES = 4096;
const SCRIPT_HEAVY = 5;

export interface HtmlText {
  readonly text: string;
  readonly looksLikeScriptApp: boolean;
}

function decoderFor(label: string): TextDecoder {
  try {
    return new TextDecoder(label);
  } catch {
    return new TextDecoder('utf-8');
  }
}

function sniffCharset(bytes: Uint8Array): string | null {
  const head = Buffer.from(bytes.subarray(0, SNIFF_BYTES)).toString('latin1');
  return /<meta[^>]+charset\s*=\s*["']?([\w-]+)/iu.exec(head)?.[1] ?? null;
}

function byteOrderMark(bytes: Uint8Array): { label: string; offset: number } | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { label: 'utf-8', offset: 3 };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { label: 'utf-16le', offset: 2 };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { label: 'utf-16be', offset: 2 };
  }
  return null;
}

export function decodeDocument(
  bytes: Uint8Array,
  headerCharset: string | null,
  sniff: boolean,
): string {
  const mark = byteOrderMark(bytes);
  if (mark !== null) {
    return decoderFor(mark.label).decode(bytes.subarray(mark.offset));
  }
  const label = headerCharset ?? (sniff ? sniffCharset(bytes) : null) ?? 'utf-8';
  return decoderFor(label).decode(bytes);
}

function hidden(attributes: Record<string, string>): boolean {
  return 'hidden' in attributes || attributes['aria-hidden'] === 'true';
}

function collapse(block: string): string {
  return block.replace(/\s+/gu, ' ').trim();
}

interface Collector {
  readonly blocks: string[];
  current: string;
  skipDepth: number;
  readonly stack: boolean[];
  scripts: number;
  emptyAppRoot: boolean;
}

function closeBlock(collector: Collector): void {
  const block = collapse(collector.current);
  if (block !== '') {
    collector.blocks.push(block);
  }
  collector.current = '';
}

function parserFor(collector: Collector): Parser {
  return new Parser(
    {
      onopentag(name, attributes) {
        const skip = SKIPPED.has(name) || hidden(attributes);
        collector.stack.push(skip);
        collector.skipDepth += skip ? 1 : 0;
        collector.scripts += name === 'script' ? 1 : 0;
        collector.emptyAppRoot ||= name === 'div' && APP_ROOTS.has(attributes['id'] ?? '');
        if (BLOCKS.has(name)) {
          closeBlock(collector);
        }
      },
      ontext(data) {
        if (collector.skipDepth === 0) {
          collector.current += data;
        }
      },
      onclosetag(name) {
        collector.skipDepth -= collector.stack.pop() === true ? 1 : 0;
        if (BLOCKS.has(name)) {
          closeBlock(collector);
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );
}

export function htmlToText(html: string): HtmlText {
  const collector: Collector = {
    blocks: [],
    current: '',
    skipDepth: 0,
    stack: [],
    scripts: 0,
    emptyAppRoot: false,
  };
  const parser = parserFor(collector);
  parser.write(html);
  parser.end();
  closeBlock(collector);
  return {
    text: collector.blocks.join('\n\n'),
    looksLikeScriptApp:
      collector.emptyAppRoot || collector.scripts >= SCRIPT_HEAVY || /<noscript/iu.test(html),
  };
}
