// ---------------------------------------------------------------------------
// i18n bootstrap (EN <-> NL). LOCKED architecture: see
// `Bookings Assistant/launch-ready-loop/I18N_ARCHITECTURE.md`.
//
// Key strategy = SEMANTIC namespaced keys WITH the English string as the INLINE
// DEFAULT: `t('hero.title', 'Bookings on Auto Pilot')`. EN therefore renders
// BYTE-IDENTICAL with NO `en.json` to maintain; we ship ONLY `nl/*.json`. A
// missing NL key falls back to the exact shipped English (never a half-English
// page), which is why `fallbackLng:'en'` + `returnEmptyString:false` are set.
//
// Flash-of-English guard: `lng` is resolved SYNCHRONOUSLY from localStorage in
// this module (imported at the very top of `main.tsx`, above the <App/> render),
// so the first paint is already in the chosen language. NL resources are bundled
// statically (eager) rather than lazy-fetched, which keeps init fully synchronous
// (zero flash) and matches the doctrine's "don't over-engineer for langs 3-5"
// rule; true per-page lazy namespaces are a deliberate later optimization once
// the public site has many translated pages.
// ---------------------------------------------------------------------------
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import nlCommon from './locales/nl/common.json';
import nlHome from './locales/nl/home.json';
import nlHowItWorks from './locales/nl/howItWorks.json';
import nlWhyUs from './locales/nl/whyUs.json';

export const LANGUAGE_STORAGE_KEY = 'ba.language';
export const SUPPORTED_LANGUAGES = ['en', 'nl'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Synchronous initial language: localStorage choice if valid, else English.
function resolveInitialLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch {
    // localStorage can throw in private-mode / sandboxed contexts; fall through.
  }
  return 'en';
}

const initialLanguage = resolveInitialLanguage();

// Keep <html lang> in sync so screen-readers, the browser and SEO see the right
// language. Run once on init and again on every change.
export function syncHtmlLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lng);
  }
}

i18n.use(initReactI18next).init({
  // No `en` resources on purpose: the inline `t(key, 'English default')` IS the
  // English source of truth. English keys resolve to their default value.
  resources: {
    nl: {
      common: nlCommon,
      home: nlHome,
      howItWorks: nlHowItWorks,
      whyUs: nlWhyUs,
    },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'home', 'howItWorks', 'whyUs'],
  returnEmptyString: false, // empty NL value -> fall back to EN, never blank
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // resources are bundled + synchronous; no suspense needed
  },
});

syncHtmlLang(initialLanguage);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
