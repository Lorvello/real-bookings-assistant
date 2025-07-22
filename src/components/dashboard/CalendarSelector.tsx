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
      return `All Calendars (${calendars.length})`;
    }
    if (selectedCalendar) {
      return selectedCalendar.name;
    }
    return 'Select Calendar';
  };

  const getDisplaySubtext = () => {
    if (viewingAllCalendars) {
      return 'Combined data from all calendars';
    }
    if (selectedCalendar) {
      return 'Individual calendar data';
    }
    return '';
  };

  if (calendars.length <= 1) {
    return null; // Don't show selector if there's only one or no calendars
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-slate-800/90 border-slate-700/50 text-slate-100 hover:bg-slate-700/90 hover:border-slate-600/50 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{getDisplayText()}</span>
              {getDisplaySubtext() && (
                <span className="text-xs text-slate-400">{getDisplaySubtext()}</span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-slate-800/95 border-slate-700/50 backdrop-blur-xl"
      >
        {/* All Calendars Option */}
        <DropdownMenuItem
          onClick={selectAllCalendars}
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 focus:bg-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-100">
                All Calendars
              </span>
              <span className="text-xs text-slate-400">
                Combined data from {calendars.length} calendars
              </span>
            </div>
          </div>
          {viewingAllCalendars && (
            <Check className="h-4 w-4 text-cyan-400" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700/50" />

        {/* Individual Calendar Options */}
        {calendars.map((calendar) => (
          <DropdownMenuItem
            key={calendar.id}
            onClick={() => selectCalendar(calendar)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 focus:bg-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-100">
                  {calendar.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    /{calendar.slug}
                  </span>
                  <Badge 
                    variant={calendar.is_active ? "default" : "secondary"}
                    className={`text-xs px-1.5 py-0.5 ${
                      calendar.is_active 
                        ? "bg-green-600/20 text-green-400 border-green-500/30" 
                        : "bg-slate-600/20 text-slate-400 border-slate-500/30"
                    }`}
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