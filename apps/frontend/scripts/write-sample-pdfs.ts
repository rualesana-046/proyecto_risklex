import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPdf, paginate, wrapText } from '../test/support/pdf-builder.ts';

const sample = readFileSync(
  new URL('../../../docs/ai-evaluation/synthetic-terms-es.md', import.meta.url),
  'utf8',
);
const directory = mkdtempSync(join(tmpdir(), 'risklex-sample-pdfs-'));
const normal = buildPdf({ pages: paginate(wrapText(sample)) });

const files: Record<string, Uint8Array> = {
  'terminos-sinteticos.pdf': normal,
  'sin-texto.pdf': buildPdf({ pages: [[]] }),
  'protegido.pdf': buildPdf({ pages: [['Documento protegido de prueba']], encrypted: true }),
  'danado.pdf': new Uint8Array([...normal.subarray(0, 40), ...new Uint8Array(200).fill(0x41)]),
};

for (const [name, bytes] of Object.entries(files)) {
  writeFileSync(join(directory, name), bytes);
}

process.stdout.write(`${directory}\n`);
