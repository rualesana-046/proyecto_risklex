const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const WORKERS_SUFFIX = '.workers.dev';

export class UnsafeTargetError extends Error {
  constructor(reason: string) {
    super(`Refusing to send the document: ${reason}`);
    this.name = 'UnsafeTargetError';
  }
}

function parse(raw: string): URL {
  try {
    return new URL(raw);
  } catch {
    throw new UnsafeTargetError('the base URL is not a valid URL.');
  }
}

export function validateBaseUrl(raw: string): URL {
  const url = parse(raw);
  if (url.username !== '' || url.password !== '') {
    throw new UnsafeTargetError('the base URL must not contain credentials.');
  }
  if (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) {
    return url;
  }
  const isWorkersHost =
    url.hostname.endsWith(WORKERS_SUFFIX) && url.hostname.length > WORKERS_SUFFIX.length;
  if (url.protocol === 'https:' && isWorkersHost) {
    return url;
  }
  throw new UnsafeTargetError(
    'only http://localhost, http://127.0.0.1 or an https address ending in .workers.dev are allowed.',
  );
}
