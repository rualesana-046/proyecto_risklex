export const CLAUSE_CATEGORIES = [
  'privacy',
  'tracking',
  'hidden_costs',
  'cancellation',
  'content_license',
] as const;
export type ClauseCategory = (typeof CLAUSE_CATEGORIES)[number];

export const SEVERITIES = ['high_risk', 'warning', 'neutral'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const USER_PROFILES = ['free_user', 'subscriber', 'professional'] as const;
export type UserProfile = (typeof USER_PROFILES)[number];

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const EVIDENCE_STATUSES = ['supported', 'insufficient_evidence'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const ENTITY_TYPES = [
  'personal_data',
  'third_party',
  'payment',
  'time_period',
  'user_right',
  'user_obligation',
  'other',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ANALYSIS_LANGUAGES = ['es', 'en'] as const;
export type AnalysisLanguage = (typeof ANALYSIS_LANGUAGES)[number];

export const RELIABILITY_LEVELS = ['normal', 'low'] as const;
export type ReliabilityLevel = (typeof RELIABILITY_LEVELS)[number];
