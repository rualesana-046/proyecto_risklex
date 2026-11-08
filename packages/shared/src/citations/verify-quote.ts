import { MAX_QUOTE_CHARACTERS, MIN_QUOTE_CHARACTERS } from '../constants/limits.constants.ts';
import { normalizeText, type NormalizedText } from './normalize-text.ts';

export type QuoteRejectionReason = 'empty' | 'ellipsis' | 'too_short' | 'too_long' | 'not_found';

export type QuoteVerification =
  | { readonly verified: true; readonly start: number; readonly end: number }
  | { readonly verified: false; readonly reason: QuoteRejectionReason };

const ELLIPSIS = /\.\.\.|…/u;

function rejectionReason(rawQuote: string, quote: string): QuoteRejectionReason | null {
  if (quote.length === 0) {
    return 'empty';
  }
  if (ELLIPSIS.test(rawQuote) || ELLIPSIS.test(quote)) {
    return 'ellipsis';
  }
  if (quote.length < MIN_QUOTE_CHARACTERS) {
    return 'too_short';
  }
  if (quote.length > MAX_QUOTE_CHARACTERS) {
    return 'too_long';
  }
  return null;
}

export function verifyQuote(document: NormalizedText, rawQuote: string): QuoteVerification {
  const quote = normalizeText(rawQuote).text;
  const reason = rejectionReason(rawQuote, quote);
  if (reason) {
    return { verified: false, reason };
  }
  const index = document.text.indexOf(quote);
  const start = document.sourceStart[index];
  const end = document.sourceEnd[index + quote.length - 1];
  if (index < 0 || start === undefined || end === undefined) {
    return { verified: false, reason: 'not_found' };
  }
  return { verified: true, start, end };
}
