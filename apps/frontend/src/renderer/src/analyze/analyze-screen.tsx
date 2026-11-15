import type { AnalysisLanguage } from '@risklex/shared';
import { useEffect, useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAnalysis } from '../../../common/analysis-vocabulary.ts';
import { ConsentDialog } from '../consent/consent-dialog.tsx';
import { useConsent } from '../consent/use-consent.ts';
import { AnalysisErrorMessage } from './analysis-error-message.tsx';
import { AnalysisProgress } from './analysis-progress.tsx';
import { DocumentInput, isAnalyzable } from './document-input.tsx';
import { useAnalysis, type RisklexBridge } from './use-analysis.ts';
import './analyze.css';

interface AnalyzeScreenProps {
  readonly bridge: RisklexBridge;
  readonly onAnalysis: (analysis: VerifiedAnalysis) => void;
}

interface AnalyzeActionsProps {
  readonly buttonRef: Ref<HTMLButtonElement>;
  readonly text: string;
  readonly running: boolean;
  readonly onAnalyze: () => void;
  readonly onCancel: () => void;
}

function AnalyzeActions({ buttonRef, text, running, onAnalyze, onCancel }: AnalyzeActionsProps) {
  const { t } = useTranslation();
  const empty = text.trim() === '';
  return (
    <div className="analyze-actions">
      <button
        ref={buttonRef}
        type="button"
        className="button-primary"
        disabled={running || !isAnalyzable(text)}
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

function useAnalyzeFlow(bridge: RisklexBridge, onAnalysis: AnalyzeScreenProps['onAnalysis']) {
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

  const run = async (text: string) => {
    const result = await start(text, language);
    if (result.status === 'succeeded') {
      onAnalysis(result.analysis);
    }
  };
  const requestAnalysis = (text: string) => {
    if (consent.granted) {
      void run(text);
    } else {
      setConsentOpen(true);
    }
  };
  const accept = (text: string) => {
    setConsentOpen(false);
    consent.grant();
    void run(text);
  };
  const dismiss = () => {
    setConsentOpen(false);
    buttonRef.current?.focus();
  };
  return { buttonRef, state, cancel, consentOpen, requestAnalysis, accept, dismiss };
}

export function AnalyzeScreen({ bridge, onAnalysis }: AnalyzeScreenProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const { buttonRef, state, cancel, consentOpen, requestAnalysis, accept, dismiss } =
    useAnalyzeFlow(bridge, onAnalysis);
  const running = state.status === 'running';
  return (
    <>
      <section className="analyze-hero">
        <h1>{t('analyze.title')}</h1>
        <p className="analyze-lead">{t('analyze.lead')}</p>
      </section>
      <section className="analyze-panel">
        <DocumentInput value={text} disabled={running} onChange={setText} />
        <AnalyzeActions
          buttonRef={buttonRef}
          text={text}
          running={running}
          onAnalyze={() => {
            requestAnalysis(text);
          }}
          onCancel={cancel}
        />
        {running ? <AnalysisProgress stage={state.stage} /> : null}
        {state.status === 'failed' ? <AnalysisErrorMessage error={state.error} /> : null}
      </section>
      <ConsentDialog
        open={consentOpen}
        onAccept={() => {
          accept(text);
        }}
        onDismiss={dismiss}
      />
    </>
  );
}
