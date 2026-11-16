import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.ts';
import { LinkForm } from './link-form.tsx';

afterEach(cleanup);

function renderForm(busy = false) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(<LinkForm busy={busy} inputRef={null} onSubmit={onSubmit} onClose={onClose} />);
  return {
    onSubmit,
    onClose,
    input: screen.getByLabelText('Dirección del enlace'),
    user: userEvent.setup(),
  };
}

describe('LinkForm', () => {
  it('always tells that the site will see the IP address before anything is downloaded', () => {
    const { input } = renderForm();
    expect(screen.getByText(/el sitio verá tu dirección IP/u)).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe('link-notice');
  });

  it('submits the trimmed address with Enter, even without a scheme', async () => {
    const { onSubmit, input, user } = renderForm();
    await user.type(input, '  ejemplo.com/terminos  {Enter}');
    expect(onSubmit).toHaveBeenCalledWith('ejemplo.com/terminos');
  });

  it('keeps the read button disabled while the address is empty', () => {
    renderForm();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Leer enlace' }).disabled).toBe(
      true,
    );
  });

  it('closes with Escape', async () => {
    const { onClose, input, user } = renderForm();
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('locks the field while a document is being read', () => {
    const { input } = renderForm(true);
    expect((input as HTMLInputElement).disabled).toBe(true);
  });
});
