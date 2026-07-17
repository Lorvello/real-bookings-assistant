import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { InstallmentSettings } from '@/components/settings/InstallmentSettings';
import { ServiceTypeInstallmentCard } from '@/components/settings/ServiceTypeInstallmentCard';

const SERVICE_ID = '00000000-0000-4000-8000-000000000301';
const EMPTY_SERVICES: string[] = [];
const EMPTY_CONFIGS: never[] = [];

vi.mock('@/hooks/useServiceTypes', () => ({
  useServiceTypes: () => ({
    serviceTypes: [{ id: SERVICE_ID, name: 'Consultation', price: 100 }],
    loading: false,
  }),
}));

vi.mock('@/contexts/CalendarContext', () => ({
  useCalendarContext: () => ({ selectedCalendar: { id: 'calendar-r19' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('R19 installment settings round-trip', () => {
  it('shows the exact channel and collection limits', () => {
    render(
      <InstallmentSettings
        installmentsEnabled={true}
        defaultPlan={{ type: 'preset', preset: '50_50' }}
        allowCustomerChoice={false}
        applyToServices="all"
        selectedServices={EMPTY_SERVICES}
        serviceConfigs={EMPTY_CONFIGS}
        onUpdate={vi.fn().mockResolvedValue(true)}
        subscriptionTier="professional"
      />,
    );

    expect(screen.getByText(/Current scope: installment plans apply to WhatsApp bookings/))
      .toBeTruthy();
    expect(screen.getByText(/No later payment is collected automatically/)).toBeTruthy();
  });

  it('emits the newly selected strict preset plan without stale state or extra deposits', async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    render(
      <ServiceTypeInstallmentCard
        serviceType={{ id: SERVICE_ID, name: 'Consultation', price: 100 }}
        plan={{ type: 'preset', preset: '50_50' }}
        onPlanChange={onPlanChange}
      />,
    );

    await user.click(screen.getByRole('radio', { name: '100% at Booking' }));

    expect(onPlanChange).toHaveBeenLastCalledWith(SERVICE_ID, {
      type: 'preset',
      preset: '100_at_booking',
    });
  });

  it('hydrates an asynchronously loaded selected-service snapshot and saves it unchanged', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(true);
    const selectedServices = [SERVICE_ID];
    const serviceConfigs = [{
      serviceTypeId: SERVICE_ID,
      enabled: true,
      plan: { type: 'preset' as const, preset: '100_at_booking' as const },
      allowCustomerChoice: false,
    }];

    const { rerender } = render(
      <InstallmentSettings
        installmentsEnabled={true}
        defaultPlan={{ type: 'preset', preset: '50_50' }}
        allowCustomerChoice={false}
        applyToServices="all"
        selectedServices={EMPTY_SERVICES}
        serviceConfigs={EMPTY_CONFIGS}
        onUpdate={onUpdate}
        subscriptionTier="professional"
      />,
    );

    rerender(
      <InstallmentSettings
        installmentsEnabled={true}
        defaultPlan={{ type: 'preset', preset: '50_50' }}
        allowCustomerChoice={false}
        applyToServices="selected"
        selectedServices={selectedServices}
        serviceConfigs={serviceConfigs}
        onUpdate={onUpdate}
        subscriptionTier="professional"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('radio', { name: 'Choose per Service Type' }),
      ).toHaveAttribute('data-state', 'checked');
      expect(screen.getByRole('checkbox', { name: 'Consultation' })).toBeChecked();
      expect(screen.getByRole('radio', { name: '100% at Booking' }))
        .toHaveAttribute('data-state', 'checked');
    });

    await user.click(screen.getByRole('button', { name: 'Save Installment Settings' }));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        enabled: true,
        allowCustomerChoice: false,
        defaultPlan: { type: 'preset', preset: '50_50' },
        applyToServices: 'selected',
        selectedServices,
        serviceConfigs,
      });
    });
  });
});
