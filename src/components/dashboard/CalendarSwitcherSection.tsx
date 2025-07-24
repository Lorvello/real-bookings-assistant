import React, { useState } from 'react';
import { ChevronDown, Plus, Edit } from 'lucide-react';
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
import { EditCalendarDialog } from '@/components/calendar-switcher/EditCalendarDialog';

interface CalendarSwitcherSectionProps {
  isSidebarOpen: boolean;
}

export function CalendarSwitcherSection({ isSidebarOpen }: CalendarSwitcherSectionProps) {
  const { selectedCalendar, calendars, selectCalendar, selectAllCalendars, viewingAllCalendars, loading, refreshCalendars } = useCalendarContext();
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

  if (!isSidebarOpen || loading || calendars.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-t border-border p-4">
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Switch Calendar
          </p>
        </div>
        
        {/* Calendar Dropdown - Clean styling to match calendar tab */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between border-border hover:border-border/80 hover:bg-muted/50"
            >
              <div className="flex items-center space-x-2 min-w-0">
                {viewingAllCalendars ? (
                  <>
                    <div className="w-3 h-3 bg-muted-foreground rounded-full flex-shrink-0" />
                    <span className="truncate text-sm">All calendars</span>
                  </>
                ) : (
                  <>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-border" 
                      style={{ backgroundColor: selectedCalendar?.color || '#6B7280' }}
                    />
                    <span className="truncate text-sm">
                      {selectedCalendar ? selectedCalendar.name : 'Select calendar'}
                    </span>
                  </>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-64 bg-card border-border z-50" align="end">
            <DropdownMenuLabel className="text-foreground">Select Calendar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* All calendars option */}
            <DropdownMenuItem
              onClick={() => selectAllCalendars()}
              className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted"
            >
              <div className="w-3 h-3 bg-muted-foreground rounded-full" />
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
                  {!viewingAllCalendars && selectedCalendar?.id === calendar.id && (
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
      </div>

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