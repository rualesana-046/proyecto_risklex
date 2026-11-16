const HEADER = '%PDF-1.4\n';
const LINE_HEIGHT = 14;
const TOP = 800;
const LEFT = 50;

function escapeText(text: string): string {
  return text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function textStream(lines: readonly string[]): string {
  const body = lines
    .map(
      (line, index) =>
        `BT /F1 11 Tf ${String(LEFT)} ${String(TOP - index * LINE_HEIGHT)} Td (${escapeText(line)}) Tj ET`,
    )
    .join('\n');
  return body === '' ? '0 0 1 rg 50 50 200 200 re f' : body;
}

interface BuildOptions {
  readonly pages: readonly (readonly string[])[];
  readonly encrypted?: boolean;
}

function assemble(objects: readonly string[], trailerExtra: string): Uint8Array {
  let body = HEADER;
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'latin1'));
    body += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, 'latin1');
  const entries = offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n${entries}`;
  body += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R ${trailerExtra}>>\nstartxref\n${String(xrefOffset)}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'latin1'));
}

const ENCRYPT_DICTIONARY =
  '<< /Filter /Standard /V 1 /R 2 /Length 40 /P -4 /O <' +
  '11'.repeat(32) +
  '> /U <' +
  '22'.repeat(32) +
  '> >>';

export function buildPdf({ pages, encrypted = false }: BuildOptions): Uint8Array {
  const pageCount = pages.length;
  const firstPage = 4;
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${String(pageCount)} /Kids [${pages.map((_page, index) => `${String(firstPage + index * 2)} 0 R`).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  pages.forEach((lines, index) => {
    const content = textStream(lines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(firstPage + index * 2 + 1)} 0 R >>`,
    );
    objects.push(
      `<< /Length ${String(Buffer.byteLength(content, 'latin1'))} >>\nstream\n${content}\nendstream`,
    );
  });
  if (encrypted) {
    objects.push(ENCRYPT_DICTIONARY);
  }
  const trailerExtra = encrypted
    ? `/Encrypt ${String(objects.length)} 0 R /ID [<${'33'.repeat(16)}> <${'33'.repeat(16)}>] `
    : '';
  return assemble(objects, trailerExtra);
}

export function wrapText(text: string, width = 90): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/u).filter((part) => part !== '')) {
      if (current.length + word.length + 1 > width) {
        lines.push(current);
        current = word;
      } else {
        current = current === '' ? word : `${current} ${word}`;
      }
    }
    lines.push(current);
  }
  return lines;
}

export function paginate(lines: readonly string[], perPage = 50): string[][] {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += perPage) {
    pages.push(lines.slice(index, index + perPage));
  }
  return pages.length === 0 ? [[]] : pages;
}
