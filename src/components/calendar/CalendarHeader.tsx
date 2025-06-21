
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
    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border bg-card">
      <div className="flex items-center space-x-4">
        {/* Navigation */}
        <button
          onClick={() => onNavigate('prev')}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          disabled={loading}
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        
        <h2 className="text-xl font-semibold text-foreground capitalize">
          {formatDateHeader()}
        </h2>
        
        <button
          onClick={() => onNavigate('next')}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          disabled={loading}
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* View Switcher */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => onViewChange('month')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'month'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'week'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('year')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'year'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Jaar
          </button>
        </div>

        {/* Nieuwe Afspraak Button */}
        <Button
          onClick={() => {
            console.log('Nieuwe Afspraak button clicked');
            onNewBooking();
          }}
          className="bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Afspraak
        </Button>
      </div>
    </div>
  );
}
