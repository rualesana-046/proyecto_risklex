import { USER_PROFILES, type UserProfile } from '@risklex/shared';
import { useTranslation } from 'react-i18next';

interface ProfileSelectorProps {
  readonly value: UserProfile;
  readonly onChange: (profile: UserProfile) => void;
}

export function ProfileSelector({ value, onChange }: ProfileSelectorProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="profile-selector">
      <legend>{t('results.profiles.legend')}</legend>
      <div className="profile-options" role="radiogroup" aria-label={t('results.profiles.legend')}>
        {USER_PROFILES.map((profile) => (
          <label key={profile} className="profile-option">
            <input
              type="radio"
              name="profile"
              value={profile}
              checked={profile === value}
              tabIndex={profile === value ? 0 : -1}
              onChange={() => {
                onChange(profile);
              }}
            />
            <span>{t(`results.profiles.${profile}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
