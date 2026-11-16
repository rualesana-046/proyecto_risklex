import type { AnalysisLanguage } from '@risklex/shared';
import type { AnalysisOutcome, AnalysisStage } from '../common/analysis-vocabulary.ts';
import type { DocumentReadOutcome } from '../common/document-sources.ts';

export interface AnalyzeRequest {
  readonly text: string;
  readonly language: AnalysisLanguage;
}

export interface RisklexApi {
  analyze(request: AnalyzeRequest): Promise<AnalysisOutcome>;
  onProgress(listener: (stage: AnalysisStage) => void): () => void;
  cancel(): void;
  pickPdf(): Promise<DocumentReadOutcome>;
  readLink(url: string): Promise<DocumentReadOutcome>;
  cancelDocumentRead(): void;
}

declare global {
  interface Window {
    readonly risklex: RisklexApi;
  }
}
