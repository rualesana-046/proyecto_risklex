import {
  analysisRequestSchema,
  MAX_DOCUMENT_CHARACTERS,
  normalizeText,
  verifyClauses,
  type AnalysisRequest,
  type AnalysisResponse,
  type Clause,
  type ClauseVerificationSummary,
  type NormalizedText,
} from '@risklex/shared';
import type { AnalysisStage, VerifiedAnalysis } from '../../../../common/analysis-vocabulary.ts';
import { ClientAnalysisError } from '../domain/client-analysis-error.ts';
import type { AnalysisClient } from '../infrastructure/analysis-http.client.ts';

export type ProgressListener = (stage: AnalysisStage) => void;

export interface RunAnalysisInput {
  readonly text: string;
  readonly language: AnalysisRequest['language'];
}

interface Attempt {
  readonly response: AnalysisResponse;
  readonly summary: ClauseVerificationSummary<Clause>;
}

interface AnalysisRun {
  readonly client: AnalysisClient;
  readonly request: AnalysisRequest;
  readonly document: NormalizedText;
  readonly signal: AbortSignal;
  readonly onProgress: ProgressListener;
}

function validateRequest(input: RunAnalysisInput): AnalysisRequest {
  const parsed = analysisRequestSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  if (input.text.length > MAX_DOCUMENT_CHARACTERS) {
    throw new ClientAnalysisError('document_too_large');
  }
  throw new ClientAnalysisError('invalid_request');
}

async function attempt(run: AnalysisRun): Promise<Attempt> {
  let response: AnalysisResponse;
  try {
    response = await run.client.analyze(run.request, run.signal);
  } catch (error) {
    throw error instanceof ClientAnalysisError ? error : new ClientAnalysisError('unexpected');
  }
  run.onProgress('verifying_quotes');
  return { response, summary: verifyClauses(run.document, response.result.clauses) };
}

async function retryIfNeeded(run: AnalysisRun, first: Attempt): Promise<[Attempt, number]> {
  if (!first.summary.exceedsDiscardThreshold) {
    return [first, 1];
  }
  run.onProgress('retrying');
  try {
    const second = await attempt(run);
    return [second.summary.discardedRatio < first.summary.discardedRatio ? second : first, 2];
  } catch (error) {
    if (error instanceof ClientAnalysisError && error.code === 'cancelled') {
      throw error;
    }
    return [first, 2];
  }
}

function toVerifiedAnalysis(text: string, best: Attempt, attempts: number): VerifiedAnalysis {
  const { summary, response } = best;
  if (summary.totalClauses > 0 && summary.verified.length === 0) {
    throw new ClientAnalysisError('low_reliability');
  }
  return {
    clauses: summary.verified.map(({ clause, span }) => ({
      clause,
      span,
      originalText: text.slice(span.start, span.end),
    })),
    glossary: response.result.glossary,
    meta: response.meta,
    reliability: summary.exceedsDiscardThreshold ? 'low' : 'normal',
    totalClauses: summary.totalClauses,
    discardedClauses: summary.discardedClauses,
    attempts,
  };
}

export async function runAnalysis(
  client: AnalysisClient | null,
  input: RunAnalysisInput,
  signal: AbortSignal,
  onProgress: ProgressListener,
): Promise<VerifiedAnalysis> {
  onProgress('validating');
  const request = validateRequest(input);
  if (client === null) {
    throw new ClientAnalysisError('configuration_missing');
  }
  const run = { client, request, document: normalizeText(request.text), signal, onProgress };
  onProgress('waiting_for_analysis');
  const [best, attempts] = await retryIfNeeded(run, await attempt(run));
  const analysis = toVerifiedAnalysis(request.text, best, attempts);
  onProgress('done');
  return analysis;
}
