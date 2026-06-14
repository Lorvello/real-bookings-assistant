
import React from 'react';
import { User } from '@supabase/supabase-js';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { AiBotStatusCard } from './AiBotStatusCard';

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
      {/* Welcome Section */}
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to your Dashboard
        </h2>
        <p className="text-subtle-foreground">
          Your fresh Supabase project is ready to go. Start building your application!
        </p>
      </div>

      {/* Today's Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysScheduleCard />
        <AiBotStatusCard />
      </div>
    </div>
  );
};
