import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClearHistoryDialog } from '../history/clear-history-dialog.tsx';

interface HistorySettingProps {
  readonly enabled: boolean;
  readonly onChange: (enabled: boolean) => void;
  readonly clearHistory: () => Promise<void>;
}

type ClearResult = 'cleared' | 'clearFailed' | null;

function useClearOffer(clearHistory: () => Promise<void>) {
  const [offered, setOffered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ClearResult>(null);
  const clear = () => {
    setConfirming(false);
    clearHistory().then(
      () => {
        setResult('cleared');
        setOffered(false);
      },
      () => {
        setResult('clearFailed');
      },
    );
  };
  return { offered, setOffered, confirming, setConfirming, result, setResult, clear };
}

function ClearOffer({ onAsk }: { readonly onAsk: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="settings-offer">
      <p>{t('settings.history.offerClear')}</p>
      <button type="button" className="button-secondary" onClick={onAsk}>
        {t('settings.history.clear')}
      </button>
    </div>
  );
}

function ClearStatus({ result }: { readonly result: ClearResult }) {
  const { t } = useTranslation();
  return (
    <p className="settings-status" role="status">
      {result === null ? '' : t(`settings.history.${result}`)}
    </p>
  );
}

export function HistorySetting({ enabled, onChange, clearHistory }: HistorySettingProps) {
  const { t } = useTranslation();
  const offer = useClearOffer(clearHistory);
  return (
    <fieldset className="settings-group" aria-describedby="history-setting-hint">
      <legend>{t('settings.history.legend')}</legend>
      <p id="history-setting-hint" className="settings-hint">
        {t('settings.history.hint')}
      </p>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            onChange(event.target.checked);
            offer.setOffered(!event.target.checked);
            offer.setResult(null);
          }}
        />
        <span>{t('settings.history.toggle')}</span>
      </label>
      {offer.offered && !enabled ? (
        <ClearOffer
          onAsk={() => {
            offer.setConfirming(true);
          }}
        />
      ) : null}
      <ClearStatus result={offer.result} />
      <ClearHistoryDialog
        open={offer.confirming}
        onConfirm={offer.clear}
        onCancel={() => {
          offer.setConfirming(false);
        }}
      />
    </fieldset>
  );
}
