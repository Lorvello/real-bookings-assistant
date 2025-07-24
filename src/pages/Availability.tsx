
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';
import { AvailabilityHeader } from '@/components/availability/AvailabilityHeader';

const Availability = () => {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full">
        <AvailabilityHeader
          setToDefault={false}
          onSetToDefaultChange={() => {}}
          hasUnsavedChanges={false}
          loading={false}
          onSave={() => {}}
        />
        
        <AvailabilityManager />
      </div>
    </DashboardLayout>
  );
};

export default Availability;
