import { API_ERROR_CODES } from '@risklex/shared';

export const CLIENT_ONLY_ERROR_CODES = [
  'network_unavailable',
  'timeout',
  'cancelled',
  'invalid_response',
  'low_reliability',
  'configuration_missing',
  'unexpected',
] as const;

export const ANALYSIS_ERROR_CODES = [...API_ERROR_CODES, ...CLIENT_ONLY_ERROR_CODES] as const;
export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

export const ANALYSIS_STAGES = [
  'validating',
  'waiting_for_analysis',
  'verifying_quotes',
  'retrying',
  'done',
] as const;
export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];
