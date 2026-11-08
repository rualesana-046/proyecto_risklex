import { describe, expect, it } from 'vitest';
import { normalizeText } from './normalize-text.ts';
import { verifyQuote, type QuoteVerification } from './verify-quote.ts';

const SOURCE = [
  'TÉRMINOS DEL SERVICIO',
  '',
  'Podremos compartir   información personal con socios comerciales',
  'y anunciantes para fines de personalización.',
  'La suscripción se renovará automáticamente — salvo cancelación con treinta (30) días de antelación.',
  'El usuario otorga una licencia “mundial, no exclusiva y sublicenciable” sobre su contenido.',
  'Los datos de uso se conservan durante la vigencia de la cuenta y la infor-',
  'mación de pago se elimina al cancelar.',
  'Podremos compartir información personal con socios comerciales.',
].join('\n');

const document = normalizeText(SOURCE);

function verify(quote: string): QuoteVerification {
  return verifyQuote(document, quote);
}

function quotedSource(result: QuoteVerification): string {
  return result.verified ? SOURCE.slice(result.start, result.end) : '';
}

describe('verifyQuote', () => {
  it('verifies an exact quote and returns its original positions', () => {
    const quote = 'y anunciantes para fines de personalización.';
    const result = verify(quote);
    expect(result.verified).toBe(true);
    expect(quotedSource(result)).toBe(quote);
  });

  it('tolerates different spacing and line breaks', () => {
    const result = verify('información personal con socios comerciales y anunciantes');
    expect(quotedSource(result)).toBe('información personal con socios comerciales\ny anunciantes');
  });

  it('tolerates straight quotes against typographic quotes', () => {
    const result = verify('licencia "mundial, no exclusiva y sublicenciable"');
    expect(quotedSource(result)).toBe('licencia “mundial, no exclusiva y sublicenciable”');
  });

  it('tolerates a simple hyphen against a long dash', () => {
    expect(verify('se renovará automáticamente - salvo cancelación').verified).toBe(true);
  });

  it('matches a word split by a hyphen at the end of a line', () => {
    const result = verify('la cuenta y la información de pago se elimina');
    expect(quotedSource(result)).toBe('la cuenta y la infor-\nmación de pago se elimina');
  });

  it('ignores letter case', () => {
    expect(verify('términos del servicio podremos compartir').verified).toBe(true);
  });

  it('returns the first occurrence of a repeated quote', () => {
    const result = verify('Podremos compartir información personal con socios comerciales');
    expect(result.verified && result.start).toBe(SOURCE.indexOf('Podremos compartir'));
  });

  it('accepts quotes of exactly the minimum and maximum length', () => {
    expect(verify('treinta (30) días de').verified).toBe(true);
    const longSource = `${'a'.repeat(300)} ${'b'.repeat(299)}`;
    expect(verifyQuote(normalizeText(longSource), longSource).verified).toBe(true);
  });

  it.each([
    ['an invented quote', 'Vendemos sus datos a cualquier empresa interesada.', 'not_found'],
    [
      'a partial quote with added words',
      'y anunciantes para fines de personalización y venta',
      'not_found',
    ],
    [
      'a quote that joins distant sentences',
      'socios comerciales con treinta (30) días',
      'not_found',
    ],
    ['a quote with three dots', 'Podremos compartir... con socios comerciales', 'ellipsis'],
    [
      'a quote with an ellipsis character',
      'Podremos compartir… con socios comerciales',
      'ellipsis',
    ],
    ['a quote shorter than 20 characters', 'treinta (30) días', 'too_short'],
    ['a quote longer than 600 characters', 'a'.repeat(601), 'too_long'],
    ['an empty quote', '', 'empty'],
    ['a blank quote', ' \n ', 'empty'],
  ])('rejects %s', (_label, quote, reason) => {
    expect(verify(quote)).toEqual({ verified: false, reason });
  });

  it('rejects any quote against an empty document', () => {
    const result = verifyQuote(normalizeText(''), 'Podremos compartir información personal');
    expect(result).toEqual({ verified: false, reason: 'not_found' });
  });
});
