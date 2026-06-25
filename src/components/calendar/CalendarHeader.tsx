
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeRangeSelector } from './TimeRangeSelector';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AppointmentUpgradeModal } from './AppointmentUpgradeModal';
import { useState } from 'react';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarHeaderProps {
  currentView: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onNewBooking: () => void;
  loading?: boolean;
  timeRange?: { startTime: string; endTime: string };
  onTimeRangeChange?: (startTime: string, endTime: string) => void;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  year: 'Year',
};

export function CalendarHeader({
  currentView,
  currentDate,
  onViewChange,
  onNavigate,
  onToday,
  onNewBooking,
  loading = false,
  timeRange,
  onTimeRangeChange,
}: CalendarHeaderProps) {
  const { userStatus } = useAccessControl();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const canCreateAppointments = userStatus.userType !== 'expired_trial' && userStatus.userType !== 'canceled_and_inactive';

  const handleNewBookingClick = () => {
    if (canCreateAppointments) {
      onNewBooking();
    } else {
      setShowUpgradeModal(true);
    }
  };

  const formatTitle = () => {
    switch (currentView) {
      case 'week':
        return format(currentDate, "'Week of' MMM d, yyyy");
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="relative border-b border-white/[0.06] px-3 py-3 sm:px-4 rounded-t-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left — period label + date navigation */}
        <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-4">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground tabular-nums sm:text-lg">
            {formatTitle()}
          </h2>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="h-8 w-8 min-w-11 md:min-w-0 rounded-md text-muted-foreground hover:text-foreground"
              disabled={loading}
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onToday}
              className="h-8 px-3 font-medium"
              disabled={loading}
            >
              Today
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="h-8 w-8 min-w-11 md:min-w-0 rounded-md text-muted-foreground hover:text-foreground"
              disabled={loading}
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right — view controls + actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Time range — week view only */}
          {currentView === 'week' && timeRange && onTimeRangeChange && (
            <TimeRangeSelector
              startTime={timeRange.startTime}
              endTime={timeRange.endTime}
              onTimeRangeChange={onTimeRangeChange}
            />
          )}

          <div className="flex items-center gap-2">
            {/* Segmented view switcher — fills width on mobile */}
            <div
              role="tablist"
              aria-label="Calendar view"
              className="flex flex-1 items-center gap-1 rounded-lg border border-white/[0.06] bg-muted/40 p-1 sm:flex-initial"
            >
              {(['month', 'week', 'year'] as const).map((view) => (
                <Button
                  key={view}
                  role="tab"
                  aria-selected={currentView === view}
                  variant={currentView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange(view)}
                  className={`h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-initial ${
                    currentView === view ? '' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
                  }`}
                >
                  {VIEW_LABELS[view]}
                </Button>
              ))}
            </div>

            {/* New appointment */}
            <Button
              onClick={handleNewBookingClick}
              disabled={loading || !canCreateAppointments}
              className={`h-9 shrink-0 rounded-lg px-4 text-sm font-medium ${
                canCreateAppointments ? '' : 'cursor-not-allowed bg-muted text-muted-foreground shadow-none'
              }`}
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sr-only sm:hidden">New appointment</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading hairline */}
      {loading && (
        <div
          className="absolute inset-x-0 bottom-0 h-px animate-pulse bg-gradient-to-r from-transparent via-primary/70 to-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}

      <AppointmentUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
