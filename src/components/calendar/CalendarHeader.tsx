
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Grid3X3, Rows3, CalendarDays } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { ViewType } from './CalendarContainer';

interface CalendarHeaderProps {
  currentView: ViewType;
  currentDate: Date;
  onViewChange: (view: ViewType) => void;
  onDateChange: (date: Date) => void;
}

export function CalendarHeader({
  currentView,
  currentDate,
  onViewChange,
  onDateChange
}: CalendarHeaderProps) {
  const navigatePrevious = () => {
    switch (currentView) {
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'year':
        onDateChange(subYears(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (currentView) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'year':
        onDateChange(addYears(currentDate, 1));
        break;
    }
  };

  const navigateToday = () => {
    onDateChange(new Date());
  };

  const getDateFormat = () => {
    switch (currentView) {
      case 'month':
        return 'MMMM yyyy';
      case 'week':
        return "'Week van' dd MMMM yyyy";
      case 'year':
        return 'yyyy';
      default:
        return 'MMMM yyyy';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        {/* Left side - Title and Navigation */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/20 rounded-2xl">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {format(currentDate, getDateFormat())}
              </h1>
              <p className="text-sm text-muted-foreground">Kalendersysteem</p>
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 bg-background/50 rounded-2xl p-1 border border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigatePrevious}
              className="h-8 w-8 p-0 rounded-xl hover:bg-muted/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToday}
              className="px-4 bg-background/80 border-border/60 hover:bg-muted/50 rounded-xl"
            >
              Vandaag
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateNext}
              className="h-8 w-8 p-0 rounded-xl hover:bg-muted/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right side - View Controls */}
        <div className="flex items-center space-x-2 bg-background/50 rounded-2xl p-1 border border-border/60">
          <Button
            variant={currentView === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
            className={`flex items-center space-x-2 px-4 rounded-xl transition-all duration-200 ${
              currentView === 'month' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'hover:bg-muted/50'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Maand</span>
          </Button>
          
          <Button
            variant={currentView === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
            className={`flex items-center space-x-2 px-4 rounded-xl transition-all duration-200 ${
              currentView === 'week' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'hover:bg-muted/50'
            }`}
          >
            <Rows3 className="h-4 w-4" />
            <span>Week</span>
          </Button>
          
          <Button
            variant={currentView === 'year' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('year')}
            className={`flex items-center space-x-2 px-4 rounded-xl transition-all duration-200 ${
              currentView === 'year' 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                : 'hover:bg-muted/50'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Jaar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
