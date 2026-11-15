export interface ParsedUrl {
  readonly protocol: string;
  readonly hostname: string;
  readonly username: string;
  readonly password: string;
  readonly href: string;
}

type UrlConstructor = new (input: string) => ParsedUrl;

const UrlParser = (globalThis as unknown as { readonly URL: UrlConstructor }).URL;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const WORKERS_SUFFIX = '.workers.dev';

export class UnsafeApiBaseUrlError extends Error {
  constructor(reason: string) {
    super(`Refusing to send the document: ${reason}`);
    this.name = 'UnsafeApiBaseUrlError';
  }
}

function parse(raw: string): ParsedUrl {
  try {
    return new UrlParser(raw);
  } catch {
    throw new UnsafeApiBaseUrlError('the base URL is not a valid URL.');
  }
}

export function validateApiBaseUrl(raw: string): ParsedUrl {
  const url = parse(raw);
  if (url.username !== '' || url.password !== '') {
    throw new UnsafeApiBaseUrlError('the base URL must not contain credentials.');
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return url;
  }
  const isWorkersHost =
    url.hostname.endsWith(WORKERS_SUFFIX) && url.hostname.length > WORKERS_SUFFIX.length;
  if (url.protocol === 'https:' && isWorkersHost) {
    return url;
  }
  throw new UnsafeApiBaseUrlError(
    'only http://localhost, http://127.0.0.1 or an https address ending in .workers.dev are allowed.',
  );
}
