
import React from 'react';
import { Check, Calendar, ChevronDown } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CalendarSelector() {
  const { 
    calendars, 
    selectedCalendar, 
    viewingAllCalendars, 
    selectCalendar, 
    selectAllCalendars 
  } = useCalendarContext();

  const getDisplayText = () => {
    if (viewingAllCalendars) {
      return `All Calendars`;
    }
    if (selectedCalendar) {
      return selectedCalendar.name;
    }
    return 'Select Calendar';
  };

  const getDisplaySubtext = () => {
    if (viewingAllCalendars) {
      return `${calendars.length} calendars`;
    }
    if (selectedCalendar) {
      return `/${selectedCalendar.slug}`;
    }
    return '';
  };

  if (calendars.length === 0) {
    return null; // Don't show selector if there are no calendars
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-border hover:border-border/80 hover:bg-muted/50 min-w-[240px] h-12 justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-foreground">{getDisplayText()}</span>
              {getDisplaySubtext() && (
                <span className="text-xs text-muted-foreground">{getDisplaySubtext()}</span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-card border-border z-50"
      >
        {/* All Calendars Option - only show if multiple calendars */}
        {calendars.length > 1 && (
          <>
            <DropdownMenuItem
              onClick={selectAllCalendars}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted focus:bg-muted transition-colors rounded-md m-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    All Calendars
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Combined data from {calendars.length} calendars
                  </span>
                </div>
              </div>
              {viewingAllCalendars && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2" />
          </>
        )}

        {/* Individual Calendar Options */}
        {calendars.map((calendar) => (
          <DropdownMenuItem
            key={calendar.id}
            onClick={() => selectCalendar(calendar)}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted focus:bg-muted transition-colors rounded-md m-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {calendar.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    /{calendar.slug}
                  </span>
                  <Badge 
                    variant={calendar.is_active ? "default" : "secondary"}
                    className={calendar.is_active 
                      ? "bg-primary/10 text-primary border-primary/30 text-xs px-2 py-0.5" 
                      : "bg-muted text-muted-foreground border-border text-xs px-2 py-0.5"
                    }
                  >
                    {calendar.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            {selectedCalendar?.id === calendar.id && !viewingAllCalendars && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
