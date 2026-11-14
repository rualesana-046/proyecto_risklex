import {
  ANALYSIS_LANGUAGES,
  CLAUSE_CATEGORIES,
  normalizeText,
  SEVERITIES,
  USER_PROFILES,
  verifyQuote,
  type AnalysisResponse,
  type Clause,
  type ConfidenceLevel,
  type EvidenceStatus,
  type QuoteRejectionReason,
  type Severity,
  type UserProfile,
} from '@risklex/shared';
import { z } from 'zod';

export const expectedSchema = z.strictObject({
  language: z.enum(ANALYSIS_LANGUAGES),
  clauses: z.array(
    z.strictObject({
      category: z.enum(CLAUSE_CATEGORIES),
      keyPhrase: z.string().min(1),
      isAmbiguous: z.boolean(),
      expectedSeverity: z.record(z.enum(USER_PROFILES), z.enum(SEVERITIES)),
    }),
  ),
  forbiddenPhrases: z.array(z.string().min(1)),
});

export type Expected = z.infer<typeof expectedSchema>;
type Plant = Expected['clauses'][number];

export interface LiveEvaluation {
  readonly returned: number;
  readonly verified: number;
  readonly reasons: readonly QuoteRejectionReason[];
  readonly planted: number;
  readonly detected: number;
  readonly severityHits: number;
  readonly severityTotal: number;
  readonly baselines: Readonly<Record<Severity, number>>;
  readonly ambiguousReal: number;
  readonly ambiguousFound: number;
  readonly ambiguousFalsePositives: number;
  readonly forbidden: number;
}

export function contains(haystack: string, needle: string): boolean {
  return normalizeText(haystack).text.includes(normalizeText(needle).text);
}

function findPlant(expected: Expected, clause: Clause): Plant | undefined {
  return expected.clauses.find(
    (plant) => plant.category === clause.category && contains(clause.quote, plant.keyPhrase),
  );
}

function severityStats(matches: readonly { plant: Plant; match: Clause }[]) {
  const pairs = matches.flatMap(({ plant, match }) =>
    USER_PROFILES.map((profile) => ({
      expected: plant.expectedSeverity[profile],
      obtained: match.profiles[profile].severity,
    })),
  );
  const count = (level: Severity): number => pairs.filter((pair) => pair.expected === level).length;
  return {
    severityHits: pairs.filter((pair) => pair.expected === pair.obtained).length,
    severityTotal: pairs.length,
    baselines: {
      high_risk: count('high_risk'),
      warning: count('warning'),
      neutral: count('neutral'),
    },
  };
}

export function evaluate(
  response: AnalysisResponse,
  text: string,
  expected: Expected,
): LiveEvaluation {
  const document = normalizeText(text);
  const clauses = response.result.clauses;
  const checks = clauses.map((clause) => ({ clause, check: verifyQuote(document, clause.quote) }));
  const verified = checks.filter((item) => item.check.verified).map((item) => item.clause);
  const matches = expected.clauses.flatMap((plant) => {
    const match = verified.find((clause) => findPlant(expected, clause) === plant);
    return match ? [{ plant, match }] : [];
  });
  return {
    returned: clauses.length,
    verified: verified.length,
    reasons: checks.flatMap((item) => (item.check.verified ? [] : [item.check.reason])),
    planted: expected.clauses.length,
    detected: matches.length,
    ...severityStats(matches),
    ambiguousReal: expected.clauses.filter((plant) => plant.isAmbiguous).length,
    ambiguousFound: matches.filter(({ plant, match }) => plant.isAmbiguous && match.isAmbiguous)
      .length,
    ambiguousFalsePositives: verified.filter(
      (clause) => clause.isAmbiguous && findPlant(expected, clause)?.isAmbiguous !== true,
    ).length,
    forbidden: clauses.filter((clause) =>
      expected.forbiddenPhrases.some(
        (phrase) => contains(clause.quote, phrase) || contains(clause.title, phrase),
      ),
    ).length,
  };
}

export interface ClauseDetail {
  readonly category: string;
  readonly keyPhrase: string | null;
  readonly verified: boolean;
  readonly expectedSeverity: Readonly<Record<UserProfile, Severity>> | null;
  readonly obtainedSeverity: Readonly<Record<UserProfile, Severity>>;
  readonly expectedAmbiguous: boolean | null;
  readonly obtainedAmbiguous: boolean;
  readonly evidenceStatus: EvidenceStatus;
  readonly confidence: ConfidenceLevel;
}

export function describeClauses(
  response: AnalysisResponse,
  text: string,
  expected: Expected,
): ClauseDetail[] {
  const document = normalizeText(text);
  return response.result.clauses.map((clause) => {
    const plant = findPlant(expected, clause);
    return {
      category: clause.category,
      keyPhrase: plant?.keyPhrase ?? null,
      verified: verifyQuote(document, clause.quote).verified,
      expectedSeverity: plant?.expectedSeverity ?? null,
      obtainedSeverity: {
        free_user: clause.profiles.free_user.severity,
        subscriber: clause.profiles.subscriber.severity,
        professional: clause.profiles.professional.severity,
      },
      expectedAmbiguous: plant?.isAmbiguous ?? null,
      obtainedAmbiguous: clause.isAmbiguous,
      evidenceStatus: clause.evidenceStatus,
      confidence: clause.confidence,
    };
  });
}
