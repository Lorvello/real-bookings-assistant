
import React, { useState } from 'react';
import { Check, ChevronDown, Grid3X3, Calendar, Plus, Edit } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { EditCalendarDialog } from '@/components/calendar-switcher/EditCalendarDialog';

export function CalendarSelector() {
  const { 
    calendars, 
    selectedCalendar, 
    viewingAllCalendars, 
    selectCalendar, 
    selectAllCalendars,
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

  const getDisplayText = () => {
    if (viewingAllCalendars) {
      return `All calendars`;
    }
    if (selectedCalendar) {
      return selectedCalendar.name;
    }
    return 'Select calendar';
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
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="border-border hover:border-border/80 hover:bg-muted/50 min-w-[200px] h-12 justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                {viewingAllCalendars ? (
                  <Grid3X3 className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <div 
                    className="w-3 h-3 rounded-full border border-border" 
                    style={{ backgroundColor: selectedCalendar?.color || '#6B7280' }}
                  />
                )}
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
          className="w-72 bg-card border-border z-50"
        >
          <DropdownMenuLabel className="flex items-center space-x-2 text-foreground">
            <Calendar className="h-4 w-4" />
            <span>Select Calendar</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* All Calendars Option - only show if multiple calendars */}
          {calendars.length > 1 && (
            <>
              <DropdownMenuItem
                onClick={selectAllCalendars}
                className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted"
              >
                <Grid3X3 className="w-3 h-3 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground">All calendars</span>
                    <Badge variant="outline" className="text-xs border-border">Mixed</Badge>
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

          {/* Individual Calendar Options */}
          {calendars.map((calendar) => (
            <DropdownMenuItem
              key={calendar.id}
              onClick={() => selectCalendar(calendar)}
              className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted group"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0 border border-border" 
                style={{ backgroundColor: calendar.color || '#6B7280' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium truncate text-foreground">{calendar.name}</span>
                  {calendar.is_default && (
                    <Badge variant="outline" className="text-xs border-border">Default</Badge>
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
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEditCalendar(calendar, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                {selectedCalendar?.id === calendar.id && !viewingAllCalendars && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              setShowCreateDialog(true);
            }}
            className="hover:bg-muted focus:bg-muted"
          >
            <Plus className="w-4 h-4 mr-2" />
            New calendar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Calendar Dialog */}
      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        trigger="button"
        onCalendarCreated={handleCalendarUpdated}
      />

      {/* Edit Calendar Dialog */}
      <EditCalendarDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        calendar={editingCalendar}
        onCalendarUpdated={handleCalendarUpdated}
      />
    </>
  );
}
