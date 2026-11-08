import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { excludedFiles, findCommentViolations, hasComment } from './find-comment-violations.js';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('hasComment', () => {
  it.each([
    ['.css', '.card { color: red; }'],
    ['.html', '<div id="root"></div>'],
    ['.yml', "color: '#FFFFFF'\nname: build"],
  ])('accepts clean %s content', (extension, content) => {
    expect(hasComment(content, extension)).toBe(false);
  });

  it.each([
    ['.css', '/* note */ .card { color: red; }'],
    ['.html', '<!-- note --><div></div>'],
    ['.yml', '# note\nname: build'],
    ['.yml', 'name: build # note'],
  ])('detects comments in %s content', (extension, content) => {
    expect(hasComment(content, extension)).toBe(true);
  });

  it('ignores file types it does not scan', () => {
    expect(hasComment('# heading', '.md')).toBe(false);
  });
});

describe('repository scan', () => {
  it('excludes the design prototype', () => {
    expect(excludedFiles.has('docs/design/risklex-prototype.html')).toBe(true);
  });

  it('finds no comments in css, html or yaml files', async () => {
    expect(await findCommentViolations(repositoryRoot)).toEqual([]);
  });
});
