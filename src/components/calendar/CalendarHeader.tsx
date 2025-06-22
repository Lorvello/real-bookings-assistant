
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
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
  console.log('CalendarHeader rendering:', { currentView, currentDate, loading });
  console.log('CalendarHeader: onNewBooking function exists:', typeof onNewBooking === 'function');
  
  const formatDateHeader = () => {
    switch (currentView) {
      case 'week':
        return format(currentDate, 'wo \'week van\' yyyy', { locale: nl });
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: nl });
      case 'year':
        return format(currentDate, 'yyyy', { locale: nl });
      default:
        return format(currentDate, 'MMMM yyyy', { locale: nl });
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-border/60 bg-gradient-to-r from-card via-card to-card/95 shadow-sm">
      <div className="flex items-center justify-between p-8 min-h-[100px]">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-6 min-w-0 flex-1">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('prev')}
              className="group p-3 hover:bg-accent/80 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md border border-border/40"
              disabled={loading}
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            
            <button
              onClick={() => onNavigate('next')}
              className="group p-3 hover:bg-accent/80 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md border border-border/40"
              disabled={loading}
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
          
          <div className="border-l border-border/60 pl-6">
            <h2 className="text-2xl font-bold text-foreground capitalize truncate bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">
              {formatDateHeader()}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentView === 'month' && 'Maandoverzicht van al je afspraken'}
              {currentView === 'week' && 'Weekplanning in detail'}
              {currentView === 'year' && 'Jaaroverzicht en statistieken'}
            </p>
          </div>
        </div>

        {/* Right side - View Switcher and New Booking Button */}
        <div className="flex items-center space-x-6 flex-shrink-0">
          {/* View Switcher */}
          <div className="flex bg-muted/60 backdrop-blur-sm rounded-xl p-1.5 shadow-inner border border-border/40">
            <button
              onClick={() => onViewChange('month')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px] ${
                currentView === 'month'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 transform scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Maand
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px] ${
                currentView === 'week'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 transform scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => onViewChange('year')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px] ${
                currentView === 'year'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 transform scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Jaar
            </button>
          </div>

          {/* Nieuwe Afspraak Button */}
          <Button
            onClick={() => {
              console.log('🚀 Nieuwe Afspraak button clicked - this should be visible!');
              onNewBooking();
            }}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 px-6 py-3 h-12 flex-shrink-0 rounded-xl font-semibold"
            disabled={loading}
          >
            <Plus className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="whitespace-nowrap">Nieuwe Afspraak</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
