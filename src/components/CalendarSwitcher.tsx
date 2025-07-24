import React, { useState } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Calendar, Grid3X3, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserContextDisplay } from './calendar-switcher/UserContextDisplay';
import { CreateCalendarDialog } from './calendar-switcher/CreateCalendarDialog';
import { EditCalendarDialog } from './calendar-switcher/EditCalendarDialog';
interface CalendarSwitcherProps {
  hideAllCalendarsOption?: boolean;
}
export function CalendarSwitcher({
  hideAllCalendarsOption = false
}: CalendarSwitcherProps) {
  const {
    selectedCalendar,
    calendars,
    selectCalendar,
    selectAllCalendars,
    viewingAllCalendars,
    loading,
    refreshCalendars
  } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const handleEditCalendar = (calendar: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCalendar(calendar);
    setShowEditDialog(true);
  };
  const handleCalendarUpdated = () => {
    refreshCalendars();
    setEditingCalendar(null);
  };
  if (loading) {
    return <div className="flex items-center space-x-3">
        <div className="w-32 h-10 bg-muted/50 rounded animate-pulse"></div>
        <div className="w-24 h-10 bg-muted/50 rounded animate-pulse"></div>
      </div>;
  }
  return <>
      

      {/* Create Calendar Dialog */}
      <CreateCalendarDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} trigger="button" onCalendarCreated={handleCalendarUpdated} />

      {/* Edit Calendar Dialog */}
      <EditCalendarDialog open={showEditDialog} onOpenChange={setShowEditDialog} calendar={editingCalendar} onCalendarUpdated={handleCalendarUpdated} />
    </>;
}