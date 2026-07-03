
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Calendar, Grid3X3, Edit } from 'lucide-react';
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
import { EditCalendarDialog } from './calendar-switcher/EditCalendarDialog';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CalendarUpgradeModal } from './calendar-switcher/CalendarUpgradeModal';

interface CalendarSwitcherProps {
  hideAllCalendarsOption?: boolean;
}

export function CalendarSwitcher({ hideAllCalendarsOption = false }: CalendarSwitcherProps) {
  const { t } = useTranslation('app');
  const { selectedCalendar, calendars, selectCalendar, selectAllCalendars, viewingAllCalendars, loading, refreshCalendars } = useCalendarContext();
  // AVAILABILITY-CALENDARSWITCH-STILL-NOOP (IUX R53): this on-page switcher is
  // rendered directly on the Availability page (src/pages/Availability.tsx),
  // above DailyAvailability, so it is an even more direct bypass than the
  // sidebar's CalendarSwitcherSection. Same guardedAction reuse, no new
  // mechanism.
  const { guardedAction } = useNavigationGuard();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { checkAccess, userStatus } = useAccessControl();

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
    return (
      <div className="flex items-center space-x-3">
        <div className="w-32 h-10 bg-muted/50 rounded animate-pulse"></div>
        <div className="w-24 h-10 bg-muted/50 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Calendar Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[120px] sm:min-w-[150px] md:min-w-[200px] border-border hover:border-border/80 hover:bg-muted/50 text-xs sm:text-sm">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  {viewingAllCalendars && !hideAllCalendarsOption ? (
                    <>
                      <Grid3X3 className="w-2 h-2 sm:w-3 sm:h-3 text-muted-foreground" />
                      <span className="truncate text-xs sm:text-sm">{t('app.calSwitch.all', 'All calendars')}</span>
                    </>
                  ) : (
                    <>
                      <div 
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full border border-border" 
                        style={{ backgroundColor: selectedCalendar?.color || 'hsl(var(--subtle-foreground))' }}
                      />
                      <span className="truncate text-xs sm:text-sm">
                        {selectedCalendar ? selectedCalendar.name : t('app.calSwitch.selectPlaceholder', 'Select calendar')}
                      </span>
                    </>
                  )}
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-72 bg-card border-border z-50">
              <DropdownMenuLabel className="flex items-center space-x-2 text-foreground">
                <Calendar className="h-4 w-4" />
                <span>{t('app.calSwitch.calendarView', 'Calendar View')}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* All calendars option - only show if not hidden */}
              {!hideAllCalendarsOption && (
                <>
                  <DropdownMenuItem
                    onClick={() => guardedAction(() => selectAllCalendars())}
                    className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted"
                  >
                    <Grid3X3 className="w-3 h-3 text-muted-foreground" />
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
                </>
              )}
              
              {/* IUX R8 P2: bounded + scrollable, same fix as CalendarSwitcherSection.tsx
                  - the base DropdownMenuContent primitive has no max-height of its own,
                  so an unbounded .map() here let a growing multi-calendar chain push
                  rows off-screen with no way to scroll to them. */}
              <div className="max-h-[50vh] overflow-y-auto">
                {calendars.map((calendar) => (
                  <DropdownMenuItem
                    key={calendar.id}
                    onClick={() => guardedAction(() => selectCalendar(calendar))}
                    className="flex items-center space-x-3 p-3 hover:bg-muted focus:bg-muted group"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                      style={{ backgroundColor: calendar.color || 'hsl(var(--subtle-foreground))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate text-foreground">{calendar.name}</span>
                        {calendar.is_default && (
                          <Badge variant="outline" className="text-xs border-border">{t('app.calSwitch.default', 'Default')}</Badge>
                        )}
                      </div>
                      {calendar.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {calendar.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('app.calSwitch.ownerYou', 'Owner: You')}
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
                      {(!viewingAllCalendars || hideAllCalendarsOption) && selectedCalendar?.id === calendar.id && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  if (checkAccess('canCreateBookings')) {
                    setShowCreateDialog(true);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }} 
                className={`hover:bg-muted focus:bg-muted ${
                  !checkAccess('canCreateBookings') ? 'opacity-60' : ''
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('app.calSwitch.new', 'New calendar')}
                {!checkAccess('canCreateBookings') && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {userStatus.userType === 'expired_trial' ? t('app.status.btnUpgrade', 'Upgrade') : t('app.status.btnReactivate', 'Reactivate')}
                  </Badge>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
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

      {/* Calendar Upgrade Modal */}
      <CalendarUpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
