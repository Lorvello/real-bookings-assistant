import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CalendarSettings } from '@/types/database';

const controls = vi.hoisted(() => ({ dictionary: {} as Record<string, unknown> }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const value = key.split('.').reduce<unknown>((item, part) =>
        item && typeof item === 'object' ? (item as Record<string, unknown>)[part] : undefined,
      controls.dictionary);
      return typeof value === 'string' ? value : fallback ?? key;
    },
  }),
}));

import { CalendarPolicySettings } from './CalendarPolicySettings';

describe('calendar reminder settings copy', () => {
  afterEach(() => { controls.dictionary = {}; });
  it.each([
    ['en', 'Appointment reminder settings.', 'Automatic reminders before the appointment cut no-shows significantly.', 'First reminder'],
    ['nl', 'Instellingen voor afspraakherinneringen.', 'Automatische herinneringen voor de afspraak verminderen no-shows aanzienlijk.', 'Eerste herinnering'],
  ])('uses a factual settings description in %s and keeps its switch working', (language, neutral, oldClaim, switchName) => {
    if (language === 'nl') controls.dictionary = JSON.parse(readFileSync(resolve(process.cwd(), 'src/i18n/locales/nl/settings.json'), 'utf8'));
    const onUpdate = vi.fn();
    render(<CalendarPolicySettings settings={{ first_reminder_enabled: false } as CalendarSettings} onUpdate={onUpdate} />);
    expect(screen.getByText(neutral)).toBeInTheDocument();
    expect(screen.queryByText(oldClaim)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: switchName }));
    expect(onUpdate).toHaveBeenCalledWith({ first_reminder_enabled: true });
  });
});
