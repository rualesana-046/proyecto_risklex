import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(
  new URL('../scripts/generate-third-party-notices.ts', import.meta.url),
);
const NOTICES = readFileSync(new URL('../THIRD-PARTY-NOTICES.txt', import.meta.url), 'utf8');
const RUN_TIMEOUT_MS = 120_000;

describe('third party notices', () => {
  it(
    'match the packages bundled in a real build and their installed licenses',
    () => {
      const result = spawnSync(process.execPath, [SCRIPT, '--check'], { encoding: 'utf8' });
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
    },
    RUN_TIMEOUT_MS,
  );

  it.each([
    'unpdf 2.2.1 (MIT)',
    'dist/licenses/LICENSE_PDFJS',
    'dist/licenses/LICENSE_OPENJPEG',
    'dist/licenses/LICENSE_JBIG2',
    'htmlparser2 12.0.0 (MIT)',
    'domhandler',
    'domutils',
    'entities',
    'react 19.3.1 (MIT)',
    'zod 4.6.7 (MIT)',
    '@fontsource/plus-jakarta-sans 5.3.0 (OFL-1.1)',
  ])('include %s', (expected) => {
    expect(NOTICES).toContain(expected);
  });

  it('carry no local paths', () => {
    expect(NOTICES).not.toMatch(/\/Users\/|\/home\/|\/private\/|[A-Z]:\\\\/u);
  });
});
