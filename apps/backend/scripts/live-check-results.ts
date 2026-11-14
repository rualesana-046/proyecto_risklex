import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analysisResponseSchema, USER_PROFILES, type AnalysisResponse } from '@risklex/shared';
import { z } from 'zod';
import {
  describeClauses,
  evaluate,
  type ClauseDetail,
  type Expected,
  type LiveEvaluation,
} from './live-check-evaluation.ts';

export const RESULTS_DIRECTORY = fileURLToPath(new URL('../.live-results/', import.meta.url));

const savedResponseSchema = z.strictObject({
  document: z.string().regex(/^[a-z0-9-]+$/u),
  savedAt: z.iso.datetime(),
  response: analysisResponseSchema,
});

export type SavedResponse = z.infer<typeof savedResponseSchema>;

export function saveResponse(
  directory: string,
  document: string,
  response: AnalysisResponse,
  now: Date = new Date(),
): string {
  mkdirSync(directory, { recursive: true });
  const savedAt = now.toISOString();
  const path = join(directory, `${document}-${savedAt.replace(/[:.]/gu, '-')}.json`);
  const saved: SavedResponse = { document, savedAt, response };
  writeFileSync(path, `${JSON.stringify(saved, null, 2)}\n`);
  return path;
}

export function loadSavedResponse(path: string): SavedResponse {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return savedResponseSchema.parse(raw);
}

function printEvaluation(result: LiveEvaluation, moreClausesLikely: boolean): void {
  const ellipsis = result.reasons.filter((reason) => reason === 'ellipsis').length;
  const lowReliability = result.reasons.length / Math.max(result.returned, 1) > 0.3;
  console.log(
    [
      `Clauses returned: ${String(result.returned)} · verified: ${String(result.verified)} · discarded: ${String(result.reasons.length)}`,
      `Discard reasons: ${result.reasons.length === 0 ? 'none' : result.reasons.join(', ')}`,
      `Discarded by ellipsis: ${String(ellipsis)}`,
      `Low reliability (more than 30 % discarded): ${String(lowReliability)}`,
      `Planted clauses detected: ${String(result.detected)} of ${String(result.planted)}`,
      `Severity matches: ${String(result.severityHits)} of ${String(result.detected * 3)}`,
      `Ambiguity matches: ${String(result.ambiguityHits)} of ${String(result.detected)}`,
      `Clauses built from forbidden phrases: ${String(result.forbidden)}`,
      `moreClausesLikely: ${String(moreClausesLikely)}`,
    ].join('\n'),
  );
}

function mark(expected: unknown, obtained: unknown): string {
  if (expected === null) {
    return 'not planted';
  }
  return expected === obtained ? 'match' : 'MISMATCH';
}

function printDetails(details: readonly ClauseDetail[]): void {
  details.forEach((detail, index) => {
    const lines = [
      `[${String(index + 1)}] ${detail.category} · planted phrase: ${detail.keyPhrase ?? 'none'} · quote verified: ${String(detail.verified)}`,
      ...USER_PROFILES.map((profile) => {
        const expected = detail.expectedSeverity?.[profile] ?? null;
        const obtained = detail.obtainedSeverity[profile];
        return `    ${profile}: expected ${expected ?? '-'} · obtained ${obtained} · ${mark(expected, obtained)}`;
      }),
      `    ambiguous: expected ${String(detail.expectedAmbiguous ?? '-')} · obtained ${String(detail.obtainedAmbiguous)} · ${mark(detail.expectedAmbiguous, detail.obtainedAmbiguous)}`,
      `    evidenceStatus ${detail.evidenceStatus} · confidence ${detail.confidence}`,
    ];
    console.log(lines.join('\n'));
  });
}

export function reportResponse(
  response: AnalysisResponse,
  document: { readonly text: string; readonly expected: Expected },
  details: boolean,
): void {
  printEvaluation(
    evaluate(response, document.text, document.expected),
    response.meta.moreClausesLikely,
  );
  if (details) {
    printDetails(describeClauses(response, document.text, document.expected));
  }
}
