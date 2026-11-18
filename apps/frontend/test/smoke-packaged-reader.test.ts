import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 'smoke-packaged-reader.ts');
const ELECTRON = String(createRequire(import.meta.url)('electron'));
const EXAMPLE_URL = 'https://example-api.example-account.workers.dev';
const RUN_TIMEOUT_MS = 180_000;

function smoke(target: string) {
  return spawnSync(process.execPath, [SCRIPT, target], {
    encoding: 'utf8',
    timeout: RUN_TIMEOUT_MS,
  });
}

describe('smoke check of the packaged pdf reader', () => {
  const work = mkdtempSync(join(tmpdir(), 'risklex-smoke-test-'));

  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it('fails when there is no packaged app', () => {
    const result = smoke(join(work, 'missing'));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No packaged app.asar or built app was found');
  });

  describe.runIf(existsSync(ELECTRON))('with a real electron', () => {
    const built = join(work, 'built');

    beforeAll(() => {
      const config = JSON.stringify({ logLevel: 'silent', build: { outDir: join(built, 'out') } });
      const build = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { build } from 'electron-vite'; await build(${config});`,
        ],
        {
          cwd: ROOT,
          env: { ...process.env, MAIN_VITE_RISKLEX_API_URL: EXAMPLE_URL },
          encoding: 'utf8',
        },
      );
      expect(build.status).toBe(0);
    }, RUN_TIMEOUT_MS);

    it(
      'passes with a working reader',
      () => {
        const result = smoke(built);
        expect(result.stdout).toContain('Packaged pdf reader OK');
        expect(result.status).toBe(0);
      },
      RUN_TIMEOUT_MS,
    );

    it(
      'fails with a broken reader',
      () => {
        const broken = join(work, 'broken');
        mkdirSync(join(broken, 'out', 'main'), { recursive: true });
        writeFileSync(
          join(broken, 'out', 'main', 'pdf-text.worker.js'),
          "throw new Error('broken reader');\n",
        );
        const result = smoke(broken);
        expect(result.stdout).toContain('FAIL terms.pdf');
        expect(result.status).not.toBe(0);
      },
      RUN_TIMEOUT_MS,
    );
  });
});
