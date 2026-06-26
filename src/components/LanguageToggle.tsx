import React from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';

// Shared EN<->NL language switch. One component, used in the public Header and
// the logged-in SidebarHeader, so the control reads identically everywhere.
// Persists the choice to localStorage (carries from the public site into the
// logged-in session) and lets i18n's languageChanged listener sync <html lang>.
//
// `variant`:
//   'pill'    - compact segmented control for the public top nav (default)
//   'sidebar' - full-width row that matches the dashboard sidebar's item rhythm

interface LanguageToggleProps {
  variant?: 'pill' | 'sidebar';
  className?: string;
}

const LABELS: Record<SupportedLanguage, string> = { en: 'EN', nl: 'NL' };
const FULL_LABELS: Record<SupportedLanguage, string> = { en: 'English', nl: 'Nederlands' };

export function LanguageToggle({ variant = 'pill', className = '' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation('common');
  // i18n.language can be a region tag (e.g. "en-US"); normalise to the base.
  const active = (i18n.language?.split('-')[0] as SupportedLanguage) || 'en';

  const setLanguage = (lng: SupportedLanguage) => {
    if (lng === active) return;
    void i18n.changeLanguage(lng);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // Persisting is best-effort; the in-memory switch still works.
    }
  };

  if (variant === 'sidebar') {
    return (
      <div
        role="group"
        aria-label={t('language.label', 'Language')}
        className={`flex items-center gap-1 rounded-lg bg-white/[0.04] p-1 ${className}`}
      >
        {SUPPORTED_LANGUAGES.map((lng) => {
          const isActive = lng === active;
          return (
            <button
              key={lng}
              type="button"
              onClick={() => setLanguage(lng)}
              aria-pressed={isActive}
              aria-label={FULL_LABELS[lng]}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                isActive
                  ? 'bg-primary/15 text-primary ring-1 ring-inset ring-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
              }`}
            >
              {LABELS[lng]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('language.label', 'Language')}
      className={`inline-flex items-center rounded-xl bg-white/[0.06] p-0.5 ring-1 ring-inset ring-white/10 ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const isActive = lng === active;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => setLanguage(lng)}
            aria-pressed={isActive}
            aria-label={FULL_LABELS[lng]}
            className={`min-h-[36px] min-w-[40px] rounded-[10px] px-2.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
              isActive
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-400/30'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {LABELS[lng]}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageToggle;
