import type { Locale } from '@/lib/i18n';
import type { LegalTexts } from './types';
import ar from './ar';
import de from './de';
import en from './en';
import es from './es';
import fa from './fa';
import fr from './fr';
import hi from './hi';
import is from './is';
import it from './it';
import ja from './ja';
import no from './no';
import pl from './pl';
import pt from './pt';
import sv from './sv';
import tr from './tr';
import zh from './zh';

export const legalTexts: Record<Locale, LegalTexts> = { ar, de, en, es, fa, fr, hi, is, it, ja, no, pl, pt, sv, tr, zh };

export function legalFor(locale: Locale | string): LegalTexts {
  return legalTexts[locale as Locale] ?? en;
}
