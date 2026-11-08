import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const commentPatterns: Record<string, RegExp> = {
  '.css': /\/\*/u,
  '.html': /<!--/u,
  '.yml': /(^|\s)#(\s|$)/mu,
  '.yaml': /(^|\s)#(\s|$)/mu,
  '.jsonc': /(^|[\s,{[])\/[/*]/mu,
};

const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'out',
  'dist',
  'release',
  'coverage',
  '.wrangler',
  '.claude',
]);

export const excludedFiles = new Set(['docs/design/risklex-prototype.html']);

export function hasComment(content: string, extension: string): boolean {
  const pattern = commentPatterns[extension];
  return pattern ? pattern.test(content) : false;
}

async function listCandidateFiles(root: string, directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : listCandidateFiles(root, fullPath);
      }
      return extname(entry.name) in commentPatterns ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

export async function findCommentViolations(root: string): Promise<string[]> {
  const files = await listCandidateFiles(root, root);
  const violations: string[] = [];
  for (const file of files) {
    const relativePath = relative(root, file).split(sep).join('/');
    if (excludedFiles.has(relativePath)) {
      continue;
    }
    if (hasComment(await readFile(file, 'utf8'), extname(file))) {
      violations.push(relativePath);
    }
  }
  return violations;
}
