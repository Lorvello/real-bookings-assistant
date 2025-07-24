
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

const Availability = () => {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        <div className="space-y-3 md:space-y-6">
          <SimplePageHeader title="Availability" />
          <AvailabilityManager />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Availability;
