
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
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
  onNewBooking: () => void;
  loading?: boolean;
  timeRange?: { startTime: string; endTime: string };
  onTimeRangeChange?: (startTime: string, endTime: string) => void;
}

export function CalendarHeader({
  currentView,
  currentDate,
  onViewChange,
  onNavigate,
  onNewBooking,
  loading = false,
  timeRange,
  onTimeRangeChange
}: CalendarHeaderProps) {
  const { checkAccess, userStatus } = useAccessControl();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const canCreateBookings = checkAccess('canCreateBookings');
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
        return format(currentDate, "'Week of' MMMM d, yyyy");
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="bg-card border-b border-border px-3 sm:px-4 py-3 rounded-t-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left Section - Title & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-3 px-3 py-2 bg-muted/50 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {formatTitle()}
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your appointments and availability
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="h-8 w-8 rounded-md hover:bg-muted transition-colors"
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="h-8 w-8 rounded-md hover:bg-muted transition-colors"
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Section - View Controls & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Time Range Selector - Only show for week view */}
          {currentView === 'week' && timeRange && onTimeRangeChange && (
            <div className="order-2 sm:order-none">
              <TimeRangeSelector
                startTime={timeRange.startTime}
                endTime={timeRange.endTime}
                onTimeRangeChange={onTimeRangeChange}
              />
            </div>
          )}

          {/* View Switcher */}
          <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border order-1 sm:order-none">
            {(['month', 'week', 'year'] as const).map((view) => (
              <Button
                key={view}
                variant={currentView === view ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(view)}
                className={`px-3 py-1.5 h-8 rounded-md font-medium transition-colors text-sm ${
                  currentView === view 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Year'}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center order-3">
            <Button
              onClick={handleNewBookingClick}
              disabled={loading || !canCreateAppointments}
              className={`h-9 px-4 rounded-lg font-medium text-sm ${
                canCreateAppointments 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-t-lg flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <AppointmentUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
