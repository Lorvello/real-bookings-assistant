
import React, { useState } from 'react';
import { ChevronDown, Plus, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export function DashboardCalendarSelector() {
  const { 
    calendars, 
    selectedCalendarIds, 
    selectMultipleCalendars, 
    toggleCalendar, 
    selectAllCalendars,
    loading 
  } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading || calendars.length === 0) {
    return (
      <div className="w-48 h-9 bg-slate-700/50 rounded-lg animate-pulse"></div>
    );
  }

  const getDisplayText = () => {
    if (selectedCalendarIds.length === 0) return 'Select calendars';
    if (selectedCalendarIds.length === calendars.length) return 'All calendars';
    if (selectedCalendarIds.length === 1) {
      const calendar = calendars.find(cal => cal.id === selectedCalendarIds[0]);
      return calendar?.name || 'Unknown calendar';
    }
    return `${selectedCalendarIds.length} calendars selected`;
  };

  const handleSelectAll = () => {
    if (selectedCalendarIds.length === calendars.length) {
      // If all are selected, deselect all except the first one
      selectMultipleCalendars([calendars[0].id]);
    } else {
      selectAllCalendars();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="justify-between bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 text-slate-200 min-w-[200px]"
          >
            <div className="flex items-center space-x-2 truncate">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="truncate">{getDisplayText()}</span>
              {selectedCalendarIds.length > 1 && (
                <Badge variant="secondary" className="bg-slate-600 text-slate-200 text-xs">
                  {selectedCalendarIds.length}
                </Badge>
              )}
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80 bg-slate-800 border-slate-700" align="end">
          <DropdownMenuLabel className="text-slate-300">Select Calendars</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-700" />
          
          {/* Select All / Deselect All */}
          <DropdownMenuItem
            onClick={handleSelectAll}
            className="flex items-center space-x-3 p-3 text-slate-300 hover:bg-slate-700 focus:bg-slate-700"
          >
            <Checkbox 
              checked={selectedCalendarIds.length === calendars.length}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium">
                {selectedCalendarIds.length === calendars.length ? 'Deselect All' : 'Select All'}
              </span>
              <p className="text-xs text-slate-400">
                {selectedCalendarIds.length === calendars.length ? 'Show only first calendar' : 'View all calendars together'}
              </p>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-slate-700" />
          
          {/* Individual Calendars */}
          {calendars.map((calendar) => {
            const isSelected = selectedCalendarIds.includes(calendar.id);
            return (
              <DropdownMenuItem
                key={calendar.id}
                onClick={() => toggleCalendar(calendar.id)}
                className="flex items-center space-x-3 p-3 text-slate-300 hover:bg-slate-700 focus:bg-slate-700"
              >
                <Checkbox 
                  checked={isSelected}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: calendar.color || '#3B82F6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">{calendar.name}</span>
                    {calendar.is_default && (
                      <Badge variant="outline" className="text-xs border-slate-600">Default</Badge>
                    )}
                  </div>
                  {calendar.description && (
                    <p className="text-xs text-slate-400 truncate">
                      {calendar.description}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-400" />
                )}
              </DropdownMenuItem>
            );
          })}
          
          <DropdownMenuSeparator className="bg-slate-700" />
          
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              setShowCreateDialog(true);
            }}
            className="text-slate-300 hover:bg-slate-700 focus:bg-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New calendar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        trigger="button"
      />
    </>
  );
}
