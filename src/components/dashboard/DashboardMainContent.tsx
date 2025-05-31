
import React from 'react';
import { ActionRequiredCard } from './ActionRequiredCard';
import { BusinessMetricsCard } from './BusinessMetricsCard';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { AiBotStatusCard } from './AiBotStatusCard';
import { ConversationHistoryCard } from './ConversationHistoryCard';
import { BookingTrendsChart } from './BookingTrendsChart';
import { CalendarEventsDisplay } from '@/components/calendar/CalendarEventsDisplay';
import { CalendarManagementCard } from './CalendarManagementCard';
import { SetupProgressCard } from './SetupProgressCard';
import { User } from '@supabase/supabase-js';

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
  return (
    <div className="xl:col-span-3 space-y-6">
      <ActionRequiredCard onCalendarModalOpen={onCalendarModalOpen} />
      
      <BusinessMetricsCard />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TodaysScheduleCard />
        <AiBotStatusCard isActive={botActive} onToggle={onBotToggle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConversationHistoryCard />
        <BookingTrendsChart bookingTrends={bookingTrends} />
      </div>

      <CalendarEventsDisplay user={user} syncing={syncing} />
      <CalendarManagementCard />
      <SetupProgressCard onCalendarModalOpen={onCalendarModalOpen} />
    </div>
  );
};
