import { ANALYSIS_LANGUAGES } from '@risklex/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEXT_SIZES, THEMES } from '../../../common/settings-vocabulary.ts';
import { ChoiceGroup } from './choice-group.tsx';
import { HistorySetting } from './history-setting.tsx';
import { changeSettings, useSettings } from './settings-store.ts';
import './settings.css';

const LANGUAGE_NAMES = { es: 'Español', en: 'English' } as const;
const LANGUAGE_CHOICES = ANALYSIS_LANGUAGES.map((value) => ({
  value,
  label: LANGUAGE_NAMES[value],
  lang: value,
}));

type Change = Parameters<typeof changeSettings>[0];

function useSave() {
  const [saveFailed, setSaveFailed] = useState(false);
  const save = (change: Change): void => {
    void changeSettings(change).then((saved) => {
      setSaveFailed(!saved);
    });
  };
  return { saveFailed, save };
}

function SaveStatus({ failed }: { readonly failed: boolean }) {
  const { t } = useTranslation();
  return (
    <p className="settings-status" role="status">
      {failed ? t('settings.saveFailed') : ''}
    </p>
  );
}

function AppearanceSettings({ save }: { readonly save: (change: Change) => void }) {
  const { t } = useTranslation();
  const settings = useSettings();
  return (
    <>
      <ChoiceGroup
        name="language"
        legend={t('settings.language.legend')}
        hint={t('settings.language.hint')}
        choices={LANGUAGE_CHOICES}
        value={settings.language}
        onChange={(language) => {
          save({ language });
        }}
      />
      <ChoiceGroup
        name="theme"
        legend={t('settings.theme.legend')}
        choices={THEMES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        value={settings.theme}
        onChange={(theme) => {
          save({ theme });
        }}
      />
      <ChoiceGroup
        name="text-size"
        legend={t('settings.textSize.legend')}
        choices={TEXT_SIZES.map((value) => ({ value, label: t(`settings.textSize.${value}`) }))}
        value={settings.textSize}
        onChange={(textSize) => {
          save({ textSize });
        }}
      />
    </>
  );
}

interface SettingsScreenProps {
  readonly bridge: Pick<Window['risklex'], 'clearHistory'>;
  readonly onShowWelcome: () => void;
}

function WelcomeSetting({ onShow }: { readonly onShow: () => void }) {
  const { t } = useTranslation();
  return (
    <fieldset className="settings-group">
      <legend>{t('settings.welcome.legend')}</legend>
      <button type="button" className="button-secondary settings-action" onClick={onShow}>
        {t('settings.welcome.replay')}
      </button>
    </fieldset>
  );
}

export function SettingsScreen({ bridge, onShowWelcome }: SettingsScreenProps) {
  const { t } = useTranslation();
  const settings = useSettings();
  const { saveFailed, save } = useSave();
  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <h1 id="settings-title">{t('settings.title')}</h1>
      <AppearanceSettings save={save} />
      <HistorySetting
        enabled={settings.historyEnabled}
        onChange={(historyEnabled) => {
          save({ historyEnabled });
        }}
        clearHistory={() => bridge.clearHistory()}
      />
      <WelcomeSetting onShow={onShowWelcome} />
      <SaveStatus failed={saveFailed} />
    </section>
  );
}
