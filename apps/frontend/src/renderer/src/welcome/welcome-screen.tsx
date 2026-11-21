import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './welcome.css';

const POINTS = ['read', 'warn', 'plain'] as const;

function WelcomeMark() {
  return (
    <svg className="welcome-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="welcome-mark-fill"
        d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"
      />
      <path className="welcome-mark-check" d="m8.4 12.2 2.5 2.5 4.8-5" />
    </svg>
  );
}

export function WelcomeScreen({ onClose }: { readonly onClose: () => void }) {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <button type="button" className="button-secondary welcome-skip" onClick={onClose}>
        {t('welcome.skip')}
      </button>
      <div className="welcome-card">
        <WelcomeMark />
        <h2 id="welcome-title" ref={titleRef} tabIndex={-1}>
          {t('welcome.title')}
        </h2>
        <p className="welcome-lead">{t('welcome.lead')}</p>
        <ul className="welcome-points">
          {POINTS.map((point) => (
            <li key={point}>{t(`welcome.points.${point}`)}</li>
          ))}
        </ul>
        <button type="button" className="button-primary" onClick={onClose}>
          {t('welcome.start')}
        </button>
      </div>
    </div>
  );
}
