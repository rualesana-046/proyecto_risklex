import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEST_SUPPORT_MARKERS } from './support/build-markers.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('test helper names searched in every build', () => {
  it.each(Object.entries(TEST_SUPPORT_MARKERS))(
    'are real exported functions of %s, so the build scan is not blind',
    (file, markers) => {
      const source = readFileSync(join(ROOT, file), 'utf8');
      for (const marker of markers) {
        expect(source).toContain(`export function ${marker}(`);
      }
    },
  );
});
