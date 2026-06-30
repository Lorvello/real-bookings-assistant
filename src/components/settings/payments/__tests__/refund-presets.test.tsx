// AS-3 proof (agent-settings-sync loop): the Pay&Book refund policy is now preset
// buttons + an optional custom free text, wired to the SAME refund_policy_text string
// that the WhatsApp agent reads per turn (AS-2). This test mounts the REAL
// PaymentFlexibilitySection and proves: the three presets + custom render as a
// radiogroup; selecting a preset calls onSelectRefundPreset with the canonical
// localized sentence; the active preset is DERIVED from a stored canonical string
// (round-trip on re-open); and choosing custom reveals the free-text editor.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { PaymentFlexibilitySection } from '@/components/settings/payments/PaymentFlexibilitySection';

// Canonical EN sentences (must match the inline defaults in the component).
const FREE24 = 'Free cancellation up to 24 hours before the appointment. After that, no refund.';
const FREE48 = 'Free cancellation up to 48 hours before the appointment. After that, no refund.';
const NONE = 'No refunds. All bookings are final.';

const baseProps = {
  paymentRequired: false,
  onToggleOptional: vi.fn(),
  deadlineHours: '24',
  onDeadlineChange: vi.fn(),
  onDeadlineBlur: vi.fn(),
  autoCancel: false,
  onToggleAutoCancel: vi.fn(),
  payOnSiteEnabled: false,
  onTogglePayOnSite: vi.fn(),
  installmentsEnabled: false,
  onToggleInstallments: vi.fn(),
  canUseInstallments: true,
  installmentConfigOpen: false,
  onToggleInstallmentConfig: vi.fn(),
  installmentSlot: <div />,
  saving: false,
  savingRefundPolicy: false,
};

function renderSection(overrides: Partial<React.ComponentProps<typeof PaymentFlexibilitySection>>) {
  const props = {
    refundPolicy: '',
    onRefundPolicyChange: vi.fn(),
    onSaveRefundPolicy: vi.fn(),
    onSelectRefundPreset: vi.fn(),
    ...baseProps,
    ...overrides,
  } as React.ComponentProps<typeof PaymentFlexibilitySection>;
  render(<PaymentFlexibilitySection {...props} />);
  return props;
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

describe('AS-3 refund-policy presets', () => {
  it('renders the three presets + custom as a radiogroup', () => {
    renderSection({});
    const group = screen.getByRole('radiogroup', { name: 'Refund policy' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(within(group).getByText('Free cancellation up to 24 hours')).toBeTruthy();
    expect(within(group).getByText('Free cancellation up to 48 hours')).toBeTruthy();
    expect(within(group).getByText('No refund (all bookings final)')).toBeTruthy();
    expect(within(group).getByText('Custom policy')).toBeTruthy();
  });

  it('selecting a preset writes its canonical sentence via onSelectRefundPreset', async () => {
    const user = userEvent.setup();
    const props = renderSection({});
    await user.click(screen.getByText('Free cancellation up to 24 hours'));
    expect(props.onSelectRefundPreset).toHaveBeenCalledWith(FREE24);

    await user.click(screen.getByText('No refund (all bookings final)'));
    expect(props.onSelectRefundPreset).toHaveBeenCalledWith(NONE);
  });

  it('round-trips: a stored canonical string marks the matching preset checked', () => {
    renderSection({ refundPolicy: FREE48 });
    const group = screen.getByRole('radiogroup', { name: 'Refund policy' });
    const radios = within(group).getAllByRole('radio');
    // free48 is the 2nd radio; it must be the only one checked.
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toContain('Free cancellation up to 48 hours');
    // The custom free-text editor is NOT shown for a preset value.
    expect(screen.queryByLabelText('Refund & cancellation policy')).toBeNull();
  });

  it('a non-empty non-matching value resolves to custom and shows the free-text editor', () => {
    renderSection({ refundPolicy: 'Some bespoke owner-authored policy.' });
    const customRadio = screen.getByRole('radio', { name: 'Custom policy' });
    expect(customRadio.getAttribute('aria-checked')).toBe('true');
    // The textarea is revealed and holds the stored text.
    const textarea = screen.getByLabelText('Refund & cancellation policy') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Some bespoke owner-authored policy.');
  });

  it('an empty value selects nothing (no preset checked, editor hidden)', () => {
    renderSection({ refundPolicy: '' });
    const group = screen.getByRole('radiogroup', { name: 'Refund policy' });
    const checked = within(group).getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
    expect(screen.queryByLabelText('Refund & cancellation policy')).toBeNull();
  });

  it('clicking custom reveals the free-text editor and stays revealed while empty', async () => {
    const user = userEvent.setup();
    const props = renderSection({ refundPolicy: FREE24 });
    // Initially a preset is active, so no editor.
    expect(screen.queryByLabelText('Refund & cancellation policy')).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Custom policy' }));
    // Switching from a preset clears the value so the owner writes their own.
    expect(props.onRefundPolicyChange).toHaveBeenCalledWith('');
    // Even with an empty value, the editor remains visible (transient custom intent),
    // and the Custom radio reads as checked.
    expect(screen.getByLabelText('Refund & cancellation policy')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Custom policy' }).getAttribute('aria-checked')).toBe('true');
  });

  it('localizes preset sentences in NL', async () => {
    await i18n.changeLanguage('nl');
    const user = userEvent.setup();
    const props = renderSection({});
    await user.click(screen.getByText('Gratis annuleren tot 24 uur vooraf'));
    expect(props.onSelectRefundPreset).toHaveBeenCalledWith(
      'Gratis annuleren tot 24 uur voor de afspraak. Daarna geen terugbetaling.',
    );
    await i18n.changeLanguage('en');
  });
});
