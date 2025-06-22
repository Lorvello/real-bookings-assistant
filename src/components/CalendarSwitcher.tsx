
import React, { useState } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
      <div className="flex items-center space-x-3">
        <div className="w-32 h-10 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-40 h-10 bg-gray-300 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <UserContextDisplay />

      <div className="flex items-center space-x-2">
        {/* Kalender Switcher Dropdown */}
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

        {/* Prominente "Nieuwe Kalender" knop */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 border-dashed border-2 hover:border-solid hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe kalender</span>
        </Button>
      </div>
    </div>
  );
}
