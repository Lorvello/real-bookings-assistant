
import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActionRequiredCard } from './ActionRequiredCard';
import { BusinessMetricsCard } from './BusinessMetricsCard';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { BookingStatusCard } from './BookingStatusCard';
import { AiBotStatusCard } from './AiBotStatusCard';
import { BookingTrendsChart } from './BookingTrendsChart';

interface DashboardMainContentProps {
  user: User;
  botActive: boolean;
  bookingTrends: Array<{ day: string; bookings: number }>;
  syncing: boolean;
  onCalendarModalOpen: () => void;
  onBotToggle: () => void;
}

export const DashboardMainContent: React.FC<DashboardMainContentProps> = ({
  user,
  botActive,
  bookingTrends,
  syncing,
  onCalendarModalOpen,
  onBotToggle
}) => {
  console.log('[DashboardMainContent] Rendering main dashboard widgets for user:', user.id);

  return (
    <div className="xl:col-span-3 space-y-6">
      {/* 🚨 ACTION REQUIRED SECTION */}
      <ActionRequiredCard 
        onCalendarModalOpen={onCalendarModalOpen}
      />

      {/* 📊 BUSINESS METRICS OVERVIEW */}
      <BusinessMetricsCard />

      {/* 📅 TODAY'S OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysScheduleCard />
        <AiBotStatusCard 
          isActive={botActive}
          onToggle={onBotToggle}
        />
      </div>

      {/* 📈 ANALYTICS & STATUS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingTrendsChart 
          bookingTrends={bookingTrends}
        />
        
        {/* 📅 NEW: Simplified Booking Status Card */}
        <BookingStatusCard />
      </div>
    </div>
  );
};
