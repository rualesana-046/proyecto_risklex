import type { UserProfile } from '@risklex/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.ts';
import { CategoryFilter } from './category-filter.tsx';
import { ProfileSelector } from './profile-selector.tsx';
import type { CategoryFilter as Filter } from './results-view-model.ts';

afterEach(cleanup);

function ControlledSelector({ onChange }: { readonly onChange: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>('free_user');
  return (
    <>
      <button type="button">antes</button>
      <ProfileSelector
        value={profile}
        onChange={(next) => {
          setProfile(next);
          onChange(next);
        }}
      />
      <button type="button">despues</button>
    </>
  );
}

function radios(): HTMLInputElement[] {
  return screen.getAllByRole<HTMLInputElement>('radio');
}

describe('ProfileSelector', () => {
  it('is a labelled native radio group with only the active option in the tab order', () => {
    render(<ControlledSelector onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: '¿Cómo usas este servicio?' })).toBeTruthy();
    expect(radios().map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    expect(radios()[0]?.checked).toBe(true);
  });

  it('moves the selection with the arrow keys and enters and leaves with Tab', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ControlledSelector onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'antes' }));
    await user.tab();
    expect(document.activeElement).toBe(radios()[0]);
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('subscriber');
    expect(radios().map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'despues' }));
  });
});

describe('CategoryFilter', () => {
  function ControlledFilter() {
    const [filter, setFilter] = useState<Filter>('all');
    return (
      <CategoryFilter categories={['privacy', 'tracking']} value={filter} onChange={setFilter} />
    );
  }

  it('offers all present categories as toggle buttons', () => {
    render(<ControlledFilter />);
    expect(screen.getByRole('group', { name: 'Filtrar por categoría' })).toBeTruthy();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Todas',
      'Privacidad',
      'Seguimiento',
    ]);
    expect(screen.getByRole('button', { name: 'Todas' }).getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['{Enter}', ' '])('toggles aria-pressed with %s', async (key) => {
    const user = userEvent.setup();
    render(<ControlledFilter />);
    screen.getByRole('button', { name: 'Privacidad' }).focus();
    await user.keyboard(key);
    expect(screen.getByRole('button', { name: 'Privacidad' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Todas' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
});
