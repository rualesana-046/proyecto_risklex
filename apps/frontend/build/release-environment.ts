import { validateApiBaseUrl } from '@risklex/shared';

export const RELEASE_MODE = 'release';
export const RELEASE_URL_ERROR =
  'MAIN_VITE_RISKLEX_API_URL is missing or invalid for a release build';

function isReleaseUrl(raw: string | undefined): boolean {
  const value = raw?.trim() ?? '';
  if (value === '') {
    return false;
  }
  try {
    return validateApiBaseUrl(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function assertReleaseEnvironment(
  mode: string,
  environment: Readonly<Record<string, string | undefined>>,
): void {
  if (mode === RELEASE_MODE && !isReleaseUrl(environment['MAIN_VITE_RISKLEX_API_URL'])) {
    throw new Error(RELEASE_URL_ERROR);
  }
}
