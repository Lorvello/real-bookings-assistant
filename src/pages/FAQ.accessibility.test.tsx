import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key, i18n: { language: 'en' } }),
}));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/PublicPageWrapper', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ScrollAnimatedSection', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/useVoiceflowChatbot', () => ({ useVoiceflowChatbot: vi.fn() }));
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));

import FAQ from '@/pages/FAQ';

it('opens the real privacy accordion and reaches its link with the keyboard', async () => {
  const user = userEvent.setup();
  render(<FAQ />);
  const trigger = screen.getByRole('button', { name: 'Is my data safe?' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  trigger.focus();
  await user.keyboard('{Enter}');
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await user.tab();
  expect(screen.getByRole('link', { name: 'Read the privacy policy' })).toHaveFocus();
});
