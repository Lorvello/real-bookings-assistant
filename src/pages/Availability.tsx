
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';

const Availability = () => {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-4">
        <div className="space-y-4">
          {/* Availability Header */}
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl shadow-lg p-4">
            <h1 className="text-2xl font-bold text-white">Availability</h1>
            <p className="text-gray-400 mt-0.5">
              Manage your calendar availability and working hours
            </p>
          </div>

          <AvailabilityManager />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Availability;
