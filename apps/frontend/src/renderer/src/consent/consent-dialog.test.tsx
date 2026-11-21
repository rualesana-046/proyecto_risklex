import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n/i18n.ts';
import { ConsentDialog } from './consent-dialog.tsx';
import { initializeConsent, resetConsentForTests, useConsent } from './use-consent.ts';

function simulateNativeDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          this.close();
        }
      },
      { once: true },
    );
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    }
  };
}

beforeAll(simulateNativeDialog);
beforeEach(resetConsentForTests);
afterEach(cleanup);

function renderDialog() {
  const onAccept = vi.fn();
  const onDismiss = vi.fn();
  render(<ConsentDialog open onAccept={onAccept} onDismiss={onDismiss} />);
  return { onAccept, onDismiss };
}

describe('ConsentDialog (simulated native dialog)', () => {
  it('explains what is sent, to whom and how long the provider may keep it', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Antes de analizar' });
    expect(dialog.textContent).toContain('el texto del documento');
    expect(dialog.textContent).toContain('backend de RiskLex');
    expect(dialog.textContent).toContain('Anthropic, su proveedor de inteligencia artificial');
    expect(dialog.textContent).toContain('identificador aleatorio de esta instalación');
    expect(dialog.textContent).toContain('la versión de la app');
    expect(dialog.textContent).toContain('hasta 30 días');
    expect(dialog.textContent).toContain('RiskLex no guarda copias en sus servidores');
    expect(dialog.textContent).toContain('Recordaremos tu respuesta en este equipo');
    expect(dialog.textContent).toContain(
      'con sus citas del documento y el nombre del archivo o del sitio de origen, se guarda en este equipo',
    );
    expect(dialog.textContent).toContain('Puedes borrarlo en Historial');
    expect(dialog.textContent).toContain('la página se descargó desde tu equipo');
    expect(dialog.textContent).toContain('dirección IP');
    expect(dialog.textContent).toContain('A la IA solo se envía el texto');
  });

  it('moves the focus to the safe choice when it opens', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('accepts only with the accept button, reachable by keyboard', async () => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderDialog();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Aceptar y analizar' }));
    await user.keyboard('{Enter}');
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the cancel button',
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      },
    ],
    [
      'the Escape key',
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.keyboard('{Escape}');
      },
    ],
  ])('dismisses without consent with %s', async (_label, close) => {
    const user = userEvent.setup();
    const { onAccept, onDismiss } = renderDialog();
    await close(user);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
  });
});

describe('useConsent', () => {
  it('starts from the saved answer', () => {
    initializeConsent(true, () => Promise.resolve());
    const { result } = renderHook(() => useConsent());
    expect(result.current.granted).toBe(true);
  });

  it('saves the consent once when it is granted', () => {
    const save = vi.fn(() => Promise.resolve());
    initializeConsent(false, save);
    const { result } = renderHook(() => useConsent());
    expect(result.current.granted).toBe(false);
    act(() => {
      result.current.grant();
      result.current.grant();
    });
    expect(result.current.granted).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps the consent for this run when saving it fails', async () => {
    initializeConsent(false, () => Promise.reject(new Error('disk full')));
    const { result } = renderHook(() => useConsent());
    act(() => {
      result.current.grant();
    });
    await Promise.resolve();
    expect(result.current.granted).toBe(true);
  });
});
