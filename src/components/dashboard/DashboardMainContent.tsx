
import React from 'react';
import { User } from '@supabase/supabase-js';
import { ActionRequiredCard } from './ActionRequiredCard';
import { BusinessMetricsCard } from './BusinessMetricsCard';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import { CalendarManagementCard } from './CalendarManagementCard';
import { AiBotStatusCard } from './AiBotStatusCard';
import { BookingTrendsChart } from './BookingTrendsChart';

/**
 * 📊 DASHBOARD MAIN CONTENT AREA
 * ==============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Dit component bevat de primaire business widgets van het dashboard.
 * Het toont alle critical information die dienstverleners nodig hebben
 * voor daily business operations en systeem monitoring.
 * 
 * 🚀 BUSINESS CRITICAL WIDGETS:
 * - Action Required: Setup stappen die completion nodig hebben
 * - Business Metrics: KPIs (revenue, appointments, response times)
 * - Today's Schedule: Vandaag geplande appointments
 * - Calendar Management: Google Calendar connection status en controls
 * - AI Bot Status: WhatsApp bot performance en activation
 * - Booking Trends: 14-day booking volume visualization
 * 
 * 🎪 RESPONSIVE GRID LAYOUT:
 * - Mobile: Single column stack
 * - Desktop: 3-column grid voor optimal space utilization
 * - Consistent spacing en visual hierarchy
 * 
 * 💡 SUCCESS METRICS:
 * - Widgets moeten load in < 2 seconden
 * - Real-time updates zonder page refresh
 * - Clear visual indicators voor system status
 * - Immediate action paths voor incomplete setup
 */

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
      {/* Shows incomplete setup steps - critical voor system activation */}
      <ActionRequiredCard 
        user={user}
        onCalendarConnect={onCalendarModalOpen}
      />

      {/* 📊 BUSINESS METRICS OVERVIEW */}
      {/* Core KPIs voor business performance monitoring */}
      <BusinessMetricsCard user={user} />

      {/* 📅 TODAY'S OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 🗓️ Today's Schedule Widget */}
        <TodaysScheduleCard user={user} />
        
        {/* 🤖 AI Bot Status Widget */}
        <AiBotStatusCard 
          botActive={botActive}
          onBotToggle={onBotToggle}
        />
      </div>

      {/* 📈 ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📊 Booking Trends Chart */}
        <BookingTrendsChart 
          data={bookingTrends}
          loading={syncing}
        />
        
        {/* 📅 Calendar Management */}
        <CalendarManagementCard />
      </div>
    </div>
  );
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Dit component orchestreert de core business widgets van het dashboard.
 * Het zorgt voor een consistent layout en data flow tussen alle widgets.
 * 
 * WIDGET HIERARCHY (by importance):
 * 1. Action Required - Blocks system usage until completed
 * 2. Business Metrics - Daily performance indicators  
 * 3. Today's Schedule - Immediate operational needs
 * 4. AI Bot Status - System activation control
 * 5. Booking Trends - Historical performance analysis
 * 6. Calendar Management - Core system dependency
 * 
 * RESPONSIVE BEHAVIOR:
 * - Mobile: Stacked widgets voor optimal viewing
 * - Tablet: 2-column grid waar possible
 * - Desktop: 3-column main area binnen 4-column page grid
 * 
 * PERFORMANCE TARGETS:
 * - Widget rendering < 500ms per component
 * - Real-time updates via WebSocket connections
 * - Smooth transitions tussen loading en loaded states
 * - Consistent spacing en visual hierarchy
 */
