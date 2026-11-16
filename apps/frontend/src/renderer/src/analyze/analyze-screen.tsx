import type { AnalysisLanguage } from '@risklex/shared';
import { useEffect, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';
import { ConsentDialog } from '../consent/consent-dialog.tsx';
import { useConsent } from '../consent/use-consent.ts';
import { AnalysisErrorMessage } from './analysis-error-message.tsx';
import { AnalysisProgress } from './analysis-progress.tsx';
import { DocumentInput, isAnalyzable } from './document-input.tsx';
import { DocumentSourcePanel } from './document-source-panel.tsx';
import { SampleDocumentButton } from './sample-document-button.tsx';
import { useAnalysis, type RisklexBridge } from './use-analysis.ts';
import { useDocumentSource, type DocumentSourceBridge } from './use-document-source.ts';
import './analyze.css';

interface AnalyzeScreenProps {
  readonly bridge: RisklexBridge & DocumentSourceBridge;
  readonly onAnalysis: (analysis: VerifiedAnalysis) => void;
}

interface AnalyzeActionsProps {
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly text: string;
  readonly running: boolean;
  readonly blocked: boolean;
  readonly onAnalyze: () => void;
  readonly onCancel: () => void;
}

function AnalyzeActions({
  buttonRef,
  text,
  running,
  blocked,
  onAnalyze,
  onCancel,
}: AnalyzeActionsProps) {
  const { t } = useTranslation();
  const empty = text.trim() === '';
  return (
    <div className="analyze-actions">
      <button
        ref={buttonRef}
        type="button"
        className="button-primary"
        disabled={running || blocked || !isAnalyzable(text)}
        aria-describedby={empty ? 'analyze-empty-hint' : undefined}
        onClick={onAnalyze}
      >
        {t('analyze.submit')}
      </button>
      {running ? (
        <button type="button" className="button-secondary" onClick={onCancel}>
          {t('analyze.cancel')}
        </button>
      ) : null}
      {empty ? (
        <p id="analyze-empty-hint" className="analyze-hint">
          {t('analyze.emptyHint')}
        </p>
      ) : null}
    </div>
  );
}

function useAnalyzeFlow(
  bridge: RisklexBridge,
  onAnalysis: AnalyzeScreenProps['onAnalysis'],
  text: string,
) {
  const { i18n } = useTranslation();
  const [consentOpen, setConsentOpen] = useState(false);
  const consent = useConsent();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { state, start, cancel } = useAnalysis(bridge);
  const language: AnalysisLanguage = i18n.language === 'en' ? 'en' : 'es';

  useEffect(() => {
    if (state.status === 'failed') {
      buttonRef.current?.focus();
    }
  }, [state.status]);

  const run = async () => {
    const result = await start(text, language);
    if (result.status === 'succeeded') {
      onAnalysis(result.analysis);
    }
  };
  const requestAnalysis = () => {
    if (consent.granted) {
      void run();
    } else {
      setConsentOpen(true);
    }
  };
  const accept = () => {
    setConsentOpen(false);
    consent.grant();
    void run();
  };
  const dismiss = () => {
    setConsentOpen(false);
    buttonRef.current?.focus();
  };
  return { buttonRef, state, cancel, consentOpen, requestAnalysis, accept, dismiss };
}

function AnalyzeHero() {
  const { t } = useTranslation();
  return (
    <section className="analyze-hero">
      <h1>{t('analyze.title')}</h1>
      <p className="analyze-lead">{t('analyze.lead')}</p>
    </section>
  );
}

function usePdfSource(bridge: DocumentSourceBridge, setText: (text: string) => void) {
  const pdfButtonRef = useRef<HTMLButtonElement>(null);
  const source = useDocumentSource(bridge, setText);
  useEffect(() => {
    if (source.state.status === 'failed') {
      pdfButtonRef.current?.focus();
    }
  }, [source.state.status]);
  return { pdfButtonRef, ...source };
}

export function AnalyzeScreen({ bridge, onAnalysis }: AnalyzeScreenProps) {
  const [text, setText] = useState('');
  const { buttonRef, state, cancel, consentOpen, requestAnalysis, accept, dismiss } =
    useAnalyzeFlow(bridge, onAnalysis, text);
  const pdf = usePdfSource(bridge, setText);
  const running = state.status === 'running';
  const reading = pdf.state.status === 'reading';
  return (
    <>
      <AnalyzeHero />
      <section className="analyze-panel">
        <DocumentSourcePanel
          state={pdf.state}
          busy={running}
          pdfButtonRef={pdf.pdfButtonRef}
          onPickPdf={() => void pdf.pickPdf()}
          onCancel={pdf.cancel}
        />
        <SampleDocumentButton disabled={running || reading} onUse={setText} />
        <DocumentInput value={text} disabled={running || reading} onChange={setText} />
        <AnalyzeActions
          buttonRef={buttonRef}
          text={text}
          running={running}
          blocked={reading}
          onAnalyze={requestAnalysis}
          onCancel={cancel}
        />
        {running ? <AnalysisProgress stage={state.stage} /> : null}
        {state.status === 'failed' ? <AnalysisErrorMessage error={state.error} /> : null}
      </section>
      <ConsentDialog open={consentOpen} onAccept={accept} onDismiss={dismiss} />
    </>
  );
}
