
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityManager } from '@/components/availability/AvailabilityManager';

const Availability = () => {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-3 md:p-8">
        <div className="space-y-4 md:space-y-6">
          {/* Availability Header */}
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-3 md:p-6">
            <h1 className="text-lg md:text-3xl font-bold text-white">Availability</h1>
            <p className="text-gray-400 mt-1 text-xs md:text-base">
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
