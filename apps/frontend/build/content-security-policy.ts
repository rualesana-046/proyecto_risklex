type Directives = Readonly<Record<string, readonly string[]>>;

const PRODUCTION_DIRECTIVES: Directives = {
  'default-src': ["'none'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'"],
  'font-src': ["'self'"],
  'connect-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'none'"],
  'object-src': ["'none'"],
};

const DEVELOPMENT_OVERRIDES: Directives = {
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'ws://localhost:*'],
};

function serialize(directives: Directives): string {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

export function contentSecurityPolicy(mode: string): string {
  if (mode === 'development') {
    return serialize({ ...PRODUCTION_DIRECTIVES, ...DEVELOPMENT_OVERRIDES });
  }
  return serialize(PRODUCTION_DIRECTIVES);
}
