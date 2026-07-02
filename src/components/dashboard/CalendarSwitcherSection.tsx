import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('app');
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
            {t('app.calSwitch.switch', 'Switch Calendar')}
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
                    <span className="truncate text-sm">{t('app.calSwitch.all', 'All calendars')}</span>
                  </>
                ) : (
                  <>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-border" 
                      style={{ backgroundColor: selectedCalendar?.color || '#6B7280' }}
                    />
                    <span className="truncate text-sm">
                      {selectedCalendar ? selectedCalendar.name : t('app.calSwitch.selectPlaceholder', 'Select calendar')}
                    </span>
                  </>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent className="w-64 bg-card border-border z-50" align="end">
            <DropdownMenuLabel className="text-foreground">{t('app.calSwitch.selectLabel', 'Select Calendar')}</DropdownMenuLabel>
            <p className="px-2 pb-1.5 text-xs leading-snug text-muted-foreground">
              {t('app.calSwitch.hint', 'Switching changes the bookings, availability and stats shown across the whole dashboard.')}
            </p>
            <DropdownMenuSeparator />
            
            {/* All calendars option */}
            <DropdownMenuItem
              onClick={() => selectAllCalendars()}
              className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted"
            >
              <div className="w-3 h-3 bg-muted-foreground rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">{t('app.calSwitch.all', 'All calendars')}</span>
                  <Badge variant="outline" className="text-xs border-border">{t('app.calSwitch.mixed', 'Mixed')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('app.calSwitch.allDesc', 'View all appointments together')}
                </p>
              </div>
              {viewingAllCalendars && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />

            {/* IUX R8 P2: bounded + scrollable so a growing multi-calendar chain
                (real persona: several locations/practitioners) never renders
                calendar rows outside the viewport with no way to reach them.
                The base DropdownMenuContent primitive has no max-height of its
                own (only overflow-hidden for the rounded-corner clip), so an
                unbounded .map() here let Radix's collision-avoidance shift the
                whole popover off-screen once the list grew past ~1 viewport. */}
            <div className="max-h-[50vh] overflow-y-auto">
              {calendars.map((calendar) => {
                const isActive = !viewingAllCalendars && selectedCalendar?.id === calendar.id;
                return (
                <DropdownMenuItem
                  key={calendar.id}
                  onClick={() => selectCalendar(calendar)}
                  className={`flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted group ${isActive ? 'bg-primary/[0.06] ring-1 ring-inset ring-primary/20' : ''}`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                    style={{ backgroundColor: calendar.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate text-foreground">{calendar.name}</span>
                      {calendar.is_default && (
                        <Badge variant="outline" className="text-xs border-border">{t('app.calSwitch.default', 'Default')}</Badge>
                      )}
                      {isActive && (
                        <Badge className="text-xs bg-primary/15 text-primary border-transparent">{t('app.calSwitch.active', 'Active')}</Badge>
                      )}
                    </div>
                    {calendar.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {calendar.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleEditCalendar(calendar, e)}
                    aria-label={t('app.calSwitch.editAria', 'Edit {{name}}', { name: calendar.name })}
                    title={t('app.calSwitch.editTitle', 'Edit calendar')}
                    className="shrink-0 p-1 h-7 w-7 text-muted-foreground opacity-70 hover:opacity-100 hover:text-foreground transition"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                setShowCreateDialog(true);
              }}
              className="hover:bg-muted focus:bg-muted"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('app.calSwitch.new', 'New calendar')}
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