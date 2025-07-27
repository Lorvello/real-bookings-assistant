
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityLayout } from '@/components/availability/AvailabilityLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';

const Availability = () => {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full md:min-h-full p-3 sm:p-4 md:p-8">
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <SimplePageHeader title="Availability" />
          <CalendarSwitcher />
          <AvailabilityLayout />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Availability;
