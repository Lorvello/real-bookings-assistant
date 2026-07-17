import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/components/Header', () => ({ default: () => null }));
vi.mock('@/components/PublicPageWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ScrollAnimatedSection', () => ({
  default: ({ children, as: Element = 'div' }: { children: React.ReactNode; as?: React.ElementType }) => (
    <Element>{children}</Element>
  ),
}));
vi.mock('@/hooks/useVoiceflowChatbot', () => ({ useVoiceflowChatbot: vi.fn() }));
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));
vi.mock('@/components/SEO/StructuredData', () => ({ FAQSchema: () => null }));
vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import FAQ from '@/pages/FAQ';

describe('FAQ public capability claims', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['false', 'false'],
    ['unset', undefined],
  ])('does not promise a Voiceflow chatbot or provided WhatsApp number when those capabilities are %s', (_state, value) => {
    vi.stubEnv('VITE_VOICEFLOW_PROJECT_ID', '');
    vi.stubEnv('VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED', value);

    render(<FAQ />);

    expect(screen.queryByText(/built-in chatbot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/we provide a professional WhatsApp Business number/i)).not.toBeInTheDocument();
    expect(screen.getByText(/connect your own WhatsApp Business number/i)).toBeInTheDocument();
  });

  it('shows each stronger claim only when its explicit env capability is enabled', () => {
    vi.stubEnv('VITE_VOICEFLOW_PROJECT_ID', 'vf-project-id');
    vi.stubEnv('VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED', 'true');

    render(<FAQ />);

    expect(screen.getByText(/built-in chatbot/i)).toBeInTheDocument();
    expect(screen.getByText(/we provide a professional WhatsApp Business number/i)).toBeInTheDocument();
  });

  it('documents the exact fail-closed public capability env contract', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');

    expect(envExample).toMatch(/^VITE_VOICEFLOW_PROJECT_ID=$/m);
    expect(envExample).toMatch(/^VITE_WHATSAPP_NUMBER_PROVISIONING_ENABLED=false$/m);
  });
});
