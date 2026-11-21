import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_VERSION } from '../../common/settings-vocabulary.ts';
import { defaultSettings, loadSettingsService, SETTINGS_FILE } from './settings.service.ts';

const FIRST_ID = '6f1c1e9e-3b0a-4c47-9d61-0f6d8f3b2a10';
const SECOND_ID = '0b8f3a52-7c1d-4e2b-8a43-5c9e1d7f6b21';
const NOW = new Date('2026-11-21T10:00:00.000Z');

let folder = '';
let path = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'risklex-settings-'));
  path = join(folder, SETTINGS_FILE);
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

function load(installId = FIRST_ID) {
  return loadSettingsService({ path, newInstallId: () => installId, now: () => NOW });
}

function stored(): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('settings service (real temporary folder)', () => {
  it('asks for consent with the first version of the privacy text', () => {
    expect(CONSENT_VERSION).toBe(1);
  });

  it('starts with Spanish, the system theme, history on and no consent', async () => {
    const service = await load();
    expect(service.current()).toEqual({
      language: 'es',
      theme: 'system',
      textSize: 'normal',
      welcomeSeen: false,
      historyEnabled: true,
      consentGranted: false,
    });
  });

  it('keeps the same install id between launches', async () => {
    expect((await load(FIRST_ID)).installId).toBe(FIRST_ID);
    expect((await load(SECOND_ID)).installId).toBe(FIRST_ID);
  });

  it('saves changes and reads them back on the next launch', async () => {
    await (await load()).update({ language: 'en', theme: 'dark', textSize: 'larger' });
    expect((await load()).current()).toMatchObject({
      language: 'en',
      theme: 'dark',
      textSize: 'larger',
    });
  });

  it('records the consent version and date, and forgets it when revoked', async () => {
    const service = await load();
    expect((await service.update({ consent: 'granted' })).consentGranted).toBe(true);
    expect(stored()).toMatchObject({
      consent: { version: CONSENT_VERSION, acceptedAt: NOW.toISOString() },
    });
    expect((await service.update({ consent: 'revoked' })).consentGranted).toBe(false);
    expect(stored()).toMatchObject({ consent: null });
  });

  it('asks again when the consent was given for another privacy text', async () => {
    const consent = { version: CONSENT_VERSION + 1, acceptedAt: NOW.toISOString() };
    writeFileSync(path, JSON.stringify({ ...defaultSettings(FIRST_ID), consent }));
    expect((await load()).current().consentGranted).toBe(false);
  });

  it('recovers from a damaged file with a new id and keeps the damaged copy', async () => {
    writeFileSync(path, '{ not json');
    const service = await load(SECOND_ID);
    expect(service.recovered).toBe(true);
    expect(service.installId).toBe(SECOND_ID);
    expect(readdirSync(folder).some((name) => name.startsWith('settings.corrupt-'))).toBe(true);
  });

  it('never exposes the install id in the public settings', async () => {
    expect(JSON.stringify((await load()).current())).not.toContain(FIRST_ID);
  });
});
