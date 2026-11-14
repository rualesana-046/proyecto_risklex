import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analysisResponseSchema, USER_PROFILES, type AnalysisResponse } from '@risklex/shared';
import { z } from 'zod';
import { checkCriteria } from './live-check-criteria.ts';
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

function percent(rate: number): string {
  return `${(rate * 100).toFixed(0)} %`;
}

function passFail(pass: boolean): string {
  return pass ? 'PASS' : 'FAIL';
}

function printEvaluation(result: LiveEvaluation, moreClausesLikely: boolean): void {
  const ellipsis = result.reasons.filter((reason) => reason === 'ellipsis').length;
  const lowReliability = result.reasons.length / Math.max(result.returned, 1) > 0.3;
  const criteria = checkCriteria(result);
  const total = String(result.severityTotal);
  console.log(
    [
      `Clauses returned: ${String(result.returned)} · verified: ${String(result.verified)} · discarded: ${String(result.reasons.length)}`,
      `Discard reasons: ${result.reasons.length === 0 ? 'none' : result.reasons.join(', ')} · by ellipsis: ${String(ellipsis)}`,
      `Low reliability (more than 30 % discarded): ${String(lowReliability)}`,
      `Planted clauses detected: ${String(result.detected)} of ${String(result.planted)}`,
      `Severity matches: ${String(result.severityHits)} of ${total} (${percent(criteria.severityRate)})`,
      `Trivial baselines over the same clauses: all high_risk ${String(result.baselines.high_risk)}, all warning ${String(result.baselines.warning)}, all neutral ${String(result.baselines.neutral)} of ${total}`,
      `Best trivial baseline: all ${criteria.bestBaseline} (${percent(criteria.bestBaselineRate)}) · margin ${((criteria.severityRate - criteria.bestBaselineRate) * 100).toFixed(0)} points`,
      `Ambiguity coverage: ${String(result.ambiguousFound)} of ${String(result.ambiguousReal)} real ambiguous found · false positives: ${String(result.ambiguousFalsePositives)}`,
      `Clauses built from forbidden phrases: ${String(result.forbidden)} · moreClausesLikely: ${String(moreClausesLikely)}`,
      `Criteria · severity >= 75 % and >= 25 points over best baseline: ${passFail(criteria.severityPass)}`,
      `Criteria · all real ambiguous found and at most 1 false positive: ${passFail(criteria.ambiguityPass)}`,
      `Criteria · no clause built from forbidden phrases: ${passFail(criteria.forbiddenPass)}`,
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

function printUnplanted(details: readonly ClauseDetail[]): void {
  const unplanted = details.filter((detail) => detail.keyPhrase === null);
  console.log(
    `Clauses not matching any planted clause (review manually): ${String(unplanted.length)}`,
  );
  for (const detail of unplanted) {
    const severities = USER_PROFILES.map(
      (profile) => `${profile} ${detail.obtainedSeverity[profile]}`,
    ).join(', ');
    console.log(
      `    ${detail.category} · ${severities} · quote verified: ${String(detail.verified)} · ambiguous: ${String(detail.obtainedAmbiguous)}`,
    );
  }
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
  const clauseDetails = describeClauses(response, document.text, document.expected);
  printUnplanted(clauseDetails);
  if (details) {
    printDetails(clauseDetails);
  }
}
