import { describe, expect, it } from 'vitest';
import { decodeDocument, htmlToText } from './html-to-text.ts';

const PAGE = `<!doctype html>
<html><head><title>Términos de Nubeo</title><style>p { color: red; }</style>
<script>window.track = 'secreto';</script></head>
<body>
  <header><nav><a href="/">Inicio</a> <a href="/precios">Precios</a></nav></header>
  <main>
    <h1>Condiciones &amp; uso</h1>
    <p>Podremos compartir tu correo
       con socios comerciales.</p>
    <ul><li>Primer punto</li><li>Segundo punto</li></ul>
    <p hidden>Texto oculto</p>
    <div aria-hidden="true">Decoración</div>
    <form><button>Aceptar cookies</button></form>
  </main>
  <footer>Pie de página</footer>
</body></html>`;

describe('htmlToText', () => {
  it('keeps titles, paragraphs and list items as separate blocks', () => {
    expect(htmlToText(PAGE).text).toBe(
      [
        'Términos de Nubeo',
        'Condiciones & uso',
        'Podremos compartir tu correo con socios comerciales.',
        'Primer punto',
        'Segundo punto',
      ].join('\n\n'),
    );
  });

  it('drops scripts, styles, navigation, forms, footers and hidden content', () => {
    const { text } = htmlToText(PAGE);
    for (const removed of [
      'secreto',
      'color: red',
      'Inicio',
      'Aceptar cookies',
      'Pie de página',
      'Texto oculto',
      'Decoración',
    ]) {
      expect(text).not.toContain(removed);
    }
  });

  it('flags pages that look like they need JavaScript', () => {
    expect(
      htmlToText('<html><body><div id="root"></div><script src="a.js"></script></body></html>')
        .looksLikeScriptApp,
    ).toBe(true);
    expect(
      htmlToText('<html><body><noscript>Activa JavaScript</noscript></body></html>')
        .looksLikeScriptApp,
    ).toBe(true);
    expect(htmlToText(PAGE).looksLikeScriptApp).toBe(false);
  });

  it('returns an empty text for a page without readable content', () => {
    expect(htmlToText('<html><body><script>1</script><nav>Menú</nav></body></html>').text).toBe('');
  });
});

describe('decodeDocument', () => {
  const latin1 = new Uint8Array(Buffer.from('<p>Cancelación</p>', 'latin1'));

  it('uses the charset from the response header', () => {
    expect(decodeDocument(latin1, 'iso-8859-1', true)).toBe('<p>Cancelación</p>');
  });

  it('falls back to the meta charset in the page', () => {
    const page = new Uint8Array(
      Buffer.from('<meta charset="windows-1252"><p>Cancelación</p>', 'latin1'),
    );
    expect(decodeDocument(page, null, true)).toContain('Cancelación');
  });

  it('honours a byte order mark over everything else', () => {
    const withBom = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...Buffer.from('<p>Cancelación</p>', 'utf8'),
    ]);
    expect(decodeDocument(withBom, 'iso-8859-1', true)).toBe('<p>Cancelación</p>');
  });

  it('defaults to utf-8 and survives an unknown label', () => {
    const utf8 = new Uint8Array(Buffer.from('<p>Cancelación</p>', 'utf8'));
    expect(decodeDocument(utf8, null, true)).toBe('<p>Cancelación</p>');
    expect(decodeDocument(utf8, 'not-a-charset', true)).toBe('<p>Cancelación</p>');
  });
});
