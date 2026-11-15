import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from './content-security-policy.ts';

function directive(policy: string, name: string): string | undefined {
  return policy
    .split('; ')
    .find((entry) => entry.startsWith(`${name} `))
    ?.slice(name.length + 1);
}

describe('contentSecurityPolicy', () => {
  it('locks down the production policy', () => {
    const policy = contentSecurityPolicy('production');
    expect(policy).not.toContain('unsafe-');
    expect(policy).not.toContain('ws:');
    expect(policy).not.toContain('data:');
    expect(directive(policy, 'default-src')).toBe("'none'");
    expect(directive(policy, 'script-src')).toBe("'self'");
    expect(directive(policy, 'connect-src')).toBe("'none'");
    expect(directive(policy, 'object-src')).toBe("'none'");
    expect(directive(policy, 'base-uri')).toBe("'none'");
  });

  it('falls back to the production policy for any other mode', () => {
    expect(contentSecurityPolicy('preview')).toBe(contentSecurityPolicy('production'));
    expect(contentSecurityPolicy('')).toBe(contentSecurityPolicy('production'));
  });

  it('relaxes only scripts, styles and the hot reload socket in development', () => {
    const development = contentSecurityPolicy('development');
    const production = contentSecurityPolicy('production');
    expect(directive(development, 'script-src')).toBe("'self' 'unsafe-inline'");
    expect(directive(development, 'style-src')).toBe("'self' 'unsafe-inline'");
    expect(directive(development, 'connect-src')).toBe("'self' ws://localhost:*");
    for (const name of [
      'default-src',
      'img-src',
      'font-src',
      'base-uri',
      'form-action',
      'object-src',
    ]) {
      expect(directive(development, name)).toBe(directive(production, name));
    }
  });
});
