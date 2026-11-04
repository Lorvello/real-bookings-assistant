import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({ language: 'en', dictionary: {} as Record<string, unknown> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  i18n: { language: controls.language },
  t: (key: string, fallback?: string) => {
    const value = key.split('.').reduce<unknown>((item, part) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>)[part] : undefined,
    controls.dictionary);
    return typeof value === 'string' ? value : fallback ?? key;
  },
}) }));

import PrivacyPolicy from '@/pages/PrivacyPolicy';

function Location() { return <div data-testid="route">{useLocation().pathname}</div>; }
afterEach(() => { controls.language = 'en'; controls.dictionary = {}; vi.restoreAllMocks(); });

it.each([
  ['en', 'Privacy Policy', 'Last updated:', 'Go back', 'The date of the last change is always displayed at the top of this document.'],
  ['nl', 'Privacybeleid', 'Laatst bijgewerkt:', 'Ga terug', 'De datum van de laatste wijziging staat altijd bovenaan dit document vermeld.'],
])('does not present today as a policy update in %s and keeps back navigation', (language, title, oldDateLabel, back, oldPromise) => {
  controls.language = language;
  if (language === 'nl') controls.dictionary = JSON.parse(readFileSync(resolve(process.cwd(), 'src/i18n/locales/nl/privacy.json'), 'utf8'));
  const length = vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
  render(<MemoryRouter initialEntries={['/privacy-policy']}><PrivacyPolicy /><Location /></MemoryRouter>);
  expect(screen.getByText(title)).toBeInTheDocument();
  expect(screen.queryByText(new RegExp(oldDateLabel, 'i'))).not.toBeInTheDocument();
  expect(screen.queryByText(new RegExp(oldPromise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: back })[0]);
  expect(screen.getByTestId('route')).toHaveTextContent('/');
  length.mockRestore();
});

it('uses the prior router entry when browser history reports a previous page', () => {
  const length = vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
  try {
    render(<MemoryRouter initialEntries={['/contact', '/privacy-policy']} initialIndex={1}><PrivacyPolicy /><Location /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Go back' })[0]);
    expect(screen.getByTestId('route')).toHaveTextContent('/contact');
  } finally {
    length.mockRestore();
  }
});
