
import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface CalendarSwitcherSectionProps {
  isSidebarOpen: boolean;
}

export function CalendarSwitcherSection({ isSidebarOpen }: CalendarSwitcherSectionProps) {
  const { selectedCalendar, calendars, selectCalendar, selectAllCalendars, viewingAllCalendars, loading } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!isSidebarOpen || loading || calendars.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-t border-gray-700 p-4 transition-all duration-300">
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Switch Calendar
          </p>
        </div>
        
        {/* Calendar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {viewingAllCalendars ? (
                  <>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex-shrink-0" />
                    <span className="truncate">All calendars</span>
                  </>
                ) : (
                  <>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
                    />
                    <span className="truncate">
                      {selectedCalendar ? selectedCalendar.name : 'Select calendar'}
                    </span>
                  </>
                )}
              </div>
              <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 transition-transform duration-200" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-64 bg-gray-800 border-gray-700" align="end">
            <DropdownMenuLabel className="text-gray-300">Select Calendar</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            
            {/* All calendars option */}
            <DropdownMenuItem
              onClick={() => selectAllCalendars()}
              className="flex items-center space-x-3 p-3 text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
            >
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">All calendars</span>
                  <Badge variant="outline" className="text-xs border-gray-600">Mixed</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  View all appointments together
                </p>
              </div>
              {viewingAllCalendars && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-gray-700" />
            
            {calendars.map((calendar) => (
              <DropdownMenuItem
                key={calendar.id}
                onClick={() => selectCalendar(calendar)}
                className="flex items-center space-x-3 p-3 text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: calendar.color || '#3B82F6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium truncate">{calendar.name}</span>
                    {calendar.is_default && (
                      <Badge variant="outline" className="text-xs border-gray-600">Default</Badge>
                    )}
                  </div>
                  {calendar.description && (
                    <p className="text-xs text-gray-400 truncate">
                      {calendar.description}
                    </p>
                  )}
                </div>
                {!viewingAllCalendars && selectedCalendar?.id === calendar.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator className="bg-gray-700" />
            
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                setShowCreateDialog(true);
              }}
              className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New calendar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Calendar Dialog */}
      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        trigger="button"
      />
    </>
  );
}
