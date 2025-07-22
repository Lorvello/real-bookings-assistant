
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
          className="bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 text-slate-100 hover:bg-slate-700/90 hover:border-cyan-400/40 min-w-[240px] h-12 justify-between transition-all duration-200 shadow-lg shadow-cyan-500/5"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-slate-100">{getDisplayText()}</span>
              {getDisplaySubtext() && (
                <span className="text-xs text-cyan-400/70">{getDisplaySubtext()}</span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-cyan-400/70" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 z-50"
      >
        {/* All Calendars Option - only show if multiple calendars */}
        {calendars.length > 1 && (
          <>
            <DropdownMenuItem
              onClick={selectAllCalendars}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-cyan-500/10 hover:text-slate-100 focus:bg-cyan-500/10 focus:text-slate-100 transition-colors rounded-lg m-1"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-100">
                    All Calendars
                  </span>
                  <span className="text-xs text-cyan-400/70">
                    Combined data from {calendars.length} calendars
                  </span>
                </div>
              </div>
              {viewingAllCalendars && (
                <Check className="h-4 w-4 text-cyan-400" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-cyan-500/20 my-2" />
          </>
        )}

        {/* Individual Calendar Options */}
        {calendars.map((calendar) => (
          <DropdownMenuItem
            key={calendar.id}
            onClick={() => selectCalendar(calendar)}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-cyan-500/10 hover:text-slate-100 focus:bg-cyan-500/10 focus:text-slate-100 transition-colors rounded-lg m-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600/30 to-slate-700/30 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100">
                  {calendar.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400/70">
                    /{calendar.slug}
                  </span>
                  <Badge 
                    variant={calendar.is_active ? "default" : "secondary"}
                    className={calendar.is_active 
                      ? "bg-green-500/20 text-green-300 border-green-500/30 text-xs px-2 py-0.5" 
                      : "bg-slate-600/20 text-slate-400 border-slate-600/30 text-xs px-2 py-0.5"
                    }
                  >
                    {calendar.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            {selectedCalendar?.id === calendar.id && !viewingAllCalendars && (
              <Check className="h-4 w-4 text-cyan-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
