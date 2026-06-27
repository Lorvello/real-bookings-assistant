
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';

const Availability = () => {
  const { t } = useTranslation('appPages');
  return (
    <DashboardLayout>
      <div className="bg-background min-h-full md:min-h-full p-3 sm:p-4 md:p-8">
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <SimplePageHeader title={t('availPage.header', 'Availability')} />
          <CalendarSwitcher />
          <AvailabilityManager />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Availability;
