
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimeRangeSelector } from './TimeRangeSelector';

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
    <div className="bg-gradient-to-r from-card/95 via-card to-card/95 backdrop-blur-xl border-b border-border/40 px-3 sm:px-4 py-2 rounded-t-3xl shadow-lg shadow-black/5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
        {/* Left Section - Title & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-primary/5 rounded-lg border">
            <Calendar className="h-4 w-4 text-primary" />
            
            <div>
              <h1 className="text-lg font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {formatTitle()}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Manage your appointments and availability
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/60 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="h-7 w-7 rounded-lg hover:bg-accent/80 transition-colors duration-200"
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="h-7 w-7 rounded-lg hover:bg-accent/80 transition-colors duration-200"
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Section - View Controls & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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
          <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/60 shadow-sm order-1 sm:order-none">
            {(['month', 'week', 'year'] as const).map((view) => (
              <Button
                key={view}
                variant={currentView === view ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(view)}
                className={`px-2 sm:px-3 py-1.5 h-7 rounded-lg font-medium transition-all duration-200 text-xs ${
                  currentView === view 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-accent/80'
                }`}
              >
                {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Year'}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center order-3">
            <Button
              onClick={onNewBooking}
              disabled={loading}
              className="h-8 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 text-xs"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-t-3xl flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-xs font-medium text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
