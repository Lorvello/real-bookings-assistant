
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';

const Availability = () => {
  return (
    <DashboardLayout>
      <AvailabilityManager />
    </DashboardLayout>
  );
};

export default Availability;
