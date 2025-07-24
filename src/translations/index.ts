import { en } from './en';
import { nl } from './nl';

export const translations = {
  en,
  nl,
} as const;

export type TranslationKeys = typeof en;
export type Language = keyof typeof translations;