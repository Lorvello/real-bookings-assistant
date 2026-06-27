// Maps the active i18next language to a date-fns locale so weekday/month names
// follow the EN<->NL toggle WITHOUT going through t() (these are NOT translation
// keys; localizing them via t() would bloat the locale JSON and trip the i18n
// CI guard). Default to enUS for any non-Dutch language so EN output stays
// byte-identical to the previous hardcoded English.
import { nl, enUS, type Locale } from 'date-fns/locale';

export function dateFnsLocale(language: string | undefined): Locale {
  return language === 'nl' ? nl : enUS;
}
