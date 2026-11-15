import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('bundled sample document', () => {
  it('is identical to the Spanish synthetic evaluation document', () => {
    const bundled = read('../src/renderer/src/analyze/sample-document.es.md');
    const evaluation = read('../../../docs/ai-evaluation/synthetic-terms-es.md');
    expect(bundled.length).toBeGreaterThan(0);
    expect(bundled).toBe(evaluation);
  });
});
