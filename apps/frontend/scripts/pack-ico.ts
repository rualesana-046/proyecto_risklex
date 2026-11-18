import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_ICO_SIZE = 256;

export interface IcoImage {
  readonly size: number;
  readonly png: Uint8Array;
}

function checkImage({ size, png }: IcoImage): void {
  const data = Buffer.from(png);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (
    !data.subarray(0, 8).equals(PNG_SIGNATURE) ||
    width !== size ||
    height !== size ||
    size > MAX_ICO_SIZE
  ) {
    throw new Error(`Invalid ${String(size)} pixel icon image`);
  }
}

export function packIco(images: readonly IcoImage[]): Uint8Array {
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = HEADER_BYTES + ENTRY_BYTES * images.length;
  const entries = images.map((image) => {
    checkImage(image);
    const entry = Buffer.alloc(ENTRY_BYTES);
    entry.writeUInt8(image.size === MAX_ICO_SIZE ? 0 : image.size, 0);
    entry.writeUInt8(image.size === MAX_ICO_SIZE ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    return entry;
  });
  return new Uint8Array(
    Buffer.concat([header, ...entries, ...images.map((image) => Buffer.from(image.png))]),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [output, ...inputs] = process.argv.slice(2);
  if (output === undefined || inputs.length === 0) {
    throw new Error('Usage: node pack-ico.ts <icon.ico> <icon-16.png> [...]');
  }
  const images = inputs.map((file) => {
    const png = readFileSync(file);
    return { size: png.readUInt32BE(16), png: new Uint8Array(png) };
  });
  writeFileSync(output, packIco(images));
}
