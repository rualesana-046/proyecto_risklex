import { validateApiBaseUrl } from '@risklex/shared';

export type ApiConfig =
  { readonly status: 'ready'; readonly baseUrl: string } | { readonly status: 'missing' };

const MISSING: ApiConfig = { status: 'missing' };

export function resolveApiConfig(raw: string | undefined, isPackaged: boolean): ApiConfig {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return MISSING;
  }
  try {
    const url = validateApiBaseUrl(trimmed);
    if (isPackaged && url.protocol !== 'https:') {
      return MISSING;
    }
    return { status: 'ready', baseUrl: url.href };
  } catch {
    return MISSING;
  }
}

export function readApiConfig(isPackaged: boolean): ApiConfig {
  return resolveApiConfig(import.meta.env.MAIN_VITE_RISKLEX_API_URL, isPackaged);
}
