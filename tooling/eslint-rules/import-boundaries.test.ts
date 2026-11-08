import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({
  overrideConfig: [tseslint.configs.disableTypeChecked],
});

async function restrictedImportCount(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  const messages = result?.messages ?? [];
  return messages.filter((message) => message.ruleId === 'no-restricted-imports').length;
}

const sharedFile = 'packages/shared/src/sample.ts';
const frontendFile = 'apps/frontend/src/main/sample.ts';
const backendFile = 'apps/backend/src/sample.ts';

describe('import boundaries', () => {
  it.each([
    "import { readFile } from 'node:fs';",
    "import { readFile } from 'fs';",
    "import { app } from 'electron';",
    "import { Hono } from 'hono';",
    "import { useState } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { value } from '@risklex/frontend';",
    "import { value } from '@risklex/backend';",
  ])('blocks %s in shared', async (code) => {
    expect(await restrictedImportCount(sharedFile, code)).toBe(1);
  });

  it('allows zod in shared', async () => {
    expect(await restrictedImportCount(sharedFile, "import { z } from 'zod';")).toBe(0);
  });

  it('blocks backend imports in the frontend', async () => {
    expect(await restrictedImportCount(frontendFile, "import { x } from '@risklex/backend';")).toBe(
      1,
    );
    expect(
      await restrictedImportCount(frontendFile, "import { x } from '../../../backend/src/app';"),
    ).toBe(1);
  });

  it('allows shared in the frontend', async () => {
    expect(await restrictedImportCount(frontendFile, "import { x } from '@risklex/shared';")).toBe(
      0,
    );
  });

  it.each([
    "import { x } from '@risklex/frontend';",
    "import { app } from 'electron';",
    "import { useState } from 'react';",
  ])('blocks %s in the backend', async (code) => {
    expect(await restrictedImportCount(backendFile, code)).toBe(1);
  });
});
