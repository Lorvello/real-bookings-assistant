
import React, { useState } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Calendar, Grid3X3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserContextDisplay } from './calendar-switcher/UserContextDisplay';
import { CreateCalendarDialog } from './calendar-switcher/CreateCalendarDialog';

interface CalendarSwitcherProps {
  hideAllCalendarsOption?: boolean;
}

export function CalendarSwitcher({ hideAllCalendarsOption = false }: CalendarSwitcherProps) {
  const { selectedCalendar, calendars, selectCalendar, selectAllCalendars, viewingAllCalendars, loading } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-32 h-10 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-40 h-10 bg-gray-300 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        <UserContextDisplay />

        <div className="flex items-center space-x-2">
          {/* Calendar Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[250px]">
                <div className="flex items-center space-x-2">
                  {viewingAllCalendars && !hideAllCalendarsOption ? (
                    <>
                      <Grid3X3 className="w-3 h-3 text-primary" />
                      <span className="truncate">All calendars</span>
                    </>
                  ) : (
                    <>
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
                      />
                      <span className="truncate">
                        {selectedCalendar ? selectedCalendar.name : 'Select calendar'}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-80">
              <DropdownMenuLabel className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Calendar View</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* All calendars option - only show if not hidden */}
              {!hideAllCalendarsOption && (
                <>
                  <DropdownMenuItem
                    onClick={() => selectAllCalendars()}
                    className="flex items-center space-x-3 p-3"
                  >
                    <Grid3X3 className="w-3 h-3 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">All calendars</span>
                        <Badge variant="outline" className="text-xs">Mixed</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        View all appointments together
                      </p>
                    </div>
                    {viewingAllCalendars && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                </>
              )}
              
              {calendars.map((calendar) => (
                <DropdownMenuItem
                  key={calendar.id}
                  onClick={() => selectCalendar(calendar)}
                  className="flex items-center space-x-3 p-3"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: calendar.color || '#3B82F6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">{calendar.name}</span>
                      {calendar.is_default && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                    </div>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {calendar.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Owner: You
                    </p>
                  </div>
                  {(!viewingAllCalendars || hideAllCalendarsOption) && selectedCalendar?.id === calendar.id && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                setShowCreateDialog(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New calendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Prominent "New Calendar" button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 border-dashed border-2 hover:border-solid hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New calendar</span>
          </Button>
        </div>
      </div>

      {/* Standalone CreateCalendarDialog for the button */}
      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        trigger="button"
      />
    </>
  );
}
