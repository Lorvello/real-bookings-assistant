
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarHeaderProps {
  currentView: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onNewBooking: () => void;
  loading?: boolean;
}

export function CalendarHeader({
  currentView,
  currentDate,
  onViewChange,
  onNavigate,
  onNewBooking,
  loading = false
}: CalendarHeaderProps) {
  const formatTitle = () => {
    switch (currentView) {
      case 'week':
        return format(currentDate, "'Week of' MMMM d, yyyy", { locale: enUS });
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return format(currentDate, 'MMMM yyyy', { locale: enUS });
    }
  };

  return (
    <div className="bg-gradient-to-r from-card/95 via-card to-card/95 backdrop-blur-xl border-b border-border/40 px-6 py-4 rounded-t-3xl shadow-lg shadow-black/5">
      <div className="flex items-center justify-between">
        {/* Left Section - Title & Navigation */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-2xl border border-primary/20 shadow-sm">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {formatTitle()}
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Manage your appointments and availability
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-1.5 border border-border/60 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              className="h-10 w-10 rounded-xl hover:bg-accent/80 transition-colors duration-200"
              disabled={loading}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onNavigate('prev')}
              className="px-4 py-2 h-10 rounded-xl border-border/60 bg-background/80 hover:bg-accent/80 transition-all duration-200 font-medium"
              disabled={loading}
            >
              Today
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              className="h-10 w-10 rounded-xl hover:bg-accent/80 transition-colors duration-200"
              disabled={loading}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Section - View Controls & Actions */}
        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="flex items-center bg-muted/50 rounded-2xl p-1.5 border border-border/60 shadow-sm">
            {(['month', 'week', 'year'] as const).map((view) => (
              <Button
                key={view}
                variant={currentView === view ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(view)}
                className={`px-4 py-2 h-9 rounded-xl font-medium transition-all duration-200 ${
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-2xl border-border/60 bg-background/80 hover:bg-accent/80 transition-all duration-200 shadow-sm"
            >
              <Users className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={onNewBooking}
              disabled={loading}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-t-3xl flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
}
