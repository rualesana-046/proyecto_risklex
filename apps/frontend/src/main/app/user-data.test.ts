import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { userDataPath } from './user-data.ts';

const APP_DATA = join('base', 'app-data');

describe('userDataPath', () => {
  it('keeps the installed app data in a folder named after the product', () => {
    expect(userDataPath(APP_DATA, true)).toBe(join(APP_DATA, 'RiskLex'));
  });

  it('keeps development data apart from the installed app', () => {
    expect(userDataPath(APP_DATA, false)).toBe(join(APP_DATA, 'RiskLex Dev'));
  });
});
