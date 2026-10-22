// All 16 dictionaries. Imported by lib/i18n.ts on the server (and by tests) through
// lib/translations/all.ts, and in the browser only by components/AllTranslations.tsx (pages whose
// language is known only in the browser). Every other page gets its own language as data from
// app/_root/RootDocument.tsx — see the note at the top of lib/i18n.ts.
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

export const all: Record<string, Record<string, string>> = {
  ar, de, en, es, fa, fr, hi, is, it, ja, no, pl, pt, sv, tr, zh,
};
