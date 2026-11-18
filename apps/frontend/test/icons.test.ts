import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { packIco } from '../scripts/pack-ico.ts';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ICO = readFileSync(new URL('../resources/icon.ico', import.meta.url));
const PNG = readFileSync(new URL('../resources/icon.png', import.meta.url));

interface IcoEntry {
  readonly size: number;
  readonly png: Buffer;
}

function entries(ico: Buffer): IcoEntry[] {
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_item, index) => {
    const base = 6 + index * 16;
    const width = ico.readUInt8(base) || 256;
    const length = ico.readUInt32LE(base + 8);
    const offset = ico.readUInt32LE(base + 12);
    return { size: width, png: ico.subarray(offset, offset + length) };
  });
}

describe('application icons', () => {
  it('pack seven png images from 16 to 256 pixels into the windows icon', () => {
    expect(ICO.readUInt16LE(0)).toBe(0);
    expect(ICO.readUInt16LE(2)).toBe(1);
    const images = entries(ICO);
    expect(images.map((image) => image.size)).toEqual([16, 24, 32, 48, 64, 128, 256]);
    for (const image of images) {
      expect([...image.png.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
      expect(image.png.readUInt32BE(16)).toBe(image.size);
      expect(image.png.readUInt32BE(20)).toBe(image.size);
    }
  });

  it('provide a 512 pixel png with transparency for linux', () => {
    expect(PNG.readUInt32BE(16)).toBe(512);
    expect(PNG.readUInt32BE(20)).toBe(512);
    expect(PNG.readUInt8(25)).toBe(6);
  });

  it('refuse an image whose size does not match its header', () => {
    const sixteen = entries(ICO)[0];
    expect(() => packIco([{ size: 32, png: new Uint8Array(sixteen?.png ?? []) }])).toThrow(
      'Invalid 32 pixel icon image',
    );
  });
});
