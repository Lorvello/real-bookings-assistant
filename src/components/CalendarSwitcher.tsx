
import React, { useState } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserContextDisplay } from './calendar-switcher/UserContextDisplay';
import { CalendarDropdownTrigger } from './calendar-switcher/CalendarDropdownTrigger';
import { CalendarDropdownContent } from './calendar-switcher/CalendarDropdownContent';

export function CalendarSwitcher() {
  const { selectedCalendar, calendars, selectCalendar, loading } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (loading) {
    return (
      <Card className="w-64">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-32 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <UserContextDisplay />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CalendarDropdownTrigger selectedCalendar={selectedCalendar} />
        </DropdownMenuTrigger>
        
        <CalendarDropdownContent
          calendars={calendars}
          selectedCalendar={selectedCalendar}
          onSelectCalendar={selectCalendar}
          showCreateDialog={showCreateDialog}
          onShowCreateDialogChange={setShowCreateDialog}
        />
      </DropdownMenu>
    </div>
  );
}
