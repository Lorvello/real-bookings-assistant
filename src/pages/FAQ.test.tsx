import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({
  language: 'en',
  dictionary: {} as Record<string, unknown>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const value = key.split('.').reduce<unknown>((item, part) =>
        item && typeof item === 'object' ? (item as Record<string, unknown>)[part] : undefined,
      controls.dictionary);
      return typeof value === 'string' ? value : fallback ?? key;
    },
    i18n: { language: controls.language },
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
vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import FAQ from '@/pages/FAQ';

describe('FAQ public capability claims', () => {
  it('describes the paid plans and Enterprise without inventing a free plan or starting price', () => {
    render(<FAQ />);

    expect(screen.getByText(/Starter costs €30\/month, Professional costs €60\/month, and Enterprise pricing is customized/i)).toBeInTheDocument();
    expect(screen.queryByText(/we offer a free plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Enterprise from €300/i)).not.toBeInTheDocument();
  });
  afterEach(() => { vi.unstubAllEnvs(); controls.language = 'en'; controls.dictionary = {}; });

  it.each([
    ['en', 'Does it send reminders?', 'Does it help reduce no-shows?', 'Can it process payments?',
      'Yes. The platform can send automatic appointment reminders by email, and you control when they go out, so customers are less likely to forget their appointment.',
      'Yes. Automatic reminders keep the appointment top of mind for your customers, which helps reduce no-shows.',
      "Yes. You can ask customers to pay a deposit or prepay when they book, securely through Stripe. It's optional and you set it per service."],
    ['nl', 'Stuurt het herinneringen?', 'Helpt het no-shows te verminderen?', 'Kan het betalingen verwerken?',
      'Ja. Het platform kan automatisch afspraakherinneringen per e-mail sturen, en jij bepaalt wanneer die verstuurd worden, zodat klanten hun afspraak minder snel vergeten.',
      'Ja. Automatische herinneringen houden de afspraak top of mind bij je klanten, wat helpt om no-shows te verminderen.',
      'Ja. Je kunt klanten vragen om bij het boeken een aanbetaling te doen of vooruit te betalen, veilig via Stripe. Het is optioneel en je stelt het per dienst in.'],
  ])('does not show unverified reminder claims in %s or FAQ structured data', (language, reminder, noShows, retained, reminderAnswer, noShowsAnswer, retainedAnswer) => {
    controls.language = language;
    if (language === 'nl') controls.dictionary = JSON.parse(readFileSync(resolve(process.cwd(), 'src/i18n/locales/nl/faq.json'), 'utf8'));
    const { container } = render(<FAQ />);
    expect(screen.queryByText(reminder)).not.toBeInTheDocument();
    expect(screen.queryByText(noShows)).not.toBeInTheDocument();
    expect(screen.queryByText(reminderAnswer)).not.toBeInTheDocument();
    expect(screen.queryByText(noShowsAnswer)).not.toBeInTheDocument();
    expect(screen.getAllByText(retained)).toHaveLength(2);
    expect(screen.getByText(retainedAnswer)).toBeInTheDocument();
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent || '{}');
    const questions = data.mainEntity.map((item: { name: string }) => item.name);
    expect(questions).not.toContain(reminder);
    expect(questions).not.toContain(noShows);
    expect(questions).toContain(retained);
    const answers = data.mainEntity.map((item: { acceptedAnswer: { text: string } }) => item.acceptedAnswer.text);
    expect(answers).not.toContain(reminderAnswer);
    expect(answers).not.toContain(noShowsAnswer);
    expect(answers).toContain(retainedAnswer);
    const search = screen.getByRole('textbox');
    fireEvent.change(search, { target: { value: reminder } });
    expect(screen.queryByText(reminder)).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: noShows } });
    expect(screen.queryByText(noShows)).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getAllByText(retained)[0]);
    expect(screen.getByText(retained)).toBeInTheDocument();
  });

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
