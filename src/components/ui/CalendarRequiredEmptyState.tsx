import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

interface CalendarRequiredEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  showCreateButton?: boolean;
  /** AVAILABILITY-EMPTYSTATE-STALE-AFTER-CREATE (IUX R63 fix): this component
   *  renders its OWN CreateCalendarDialog instance. Callers whose own "no
   *  calendars" gate is driven by a SEPARATE useCalendars() instance (e.g.
   *  AvailabilityManager, which intentionally keeps its own instance so its
   *  loading flag never mismatches, see RUX-2) must pass their own refetch
   *  here so a calendar created from THIS empty state's dialog is reflected;
   *  otherwise nothing tells that separate instance to refetch and the empty
   *  state stays stuck even though the calendar exists (proven live, IUX R63).
   *  Optional and a no-op by default so callers reading calendars straight
   *  from CalendarContext (already kept in sync by useCreateCalendar itself)
   *  don't need to pass anything. */
  onCalendarCreated?: () => void;
}

export function CalendarRequiredEmptyState({
  icon,
  title,
  description,
  showCreateButton = true,
  onCalendarCreated
}: CalendarRequiredEmptyStateProps) {
  const { t } = useTranslation('appPages');
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="glow-accent relative w-16 h-16 bg-primary/10 ring-1 ring-primary/20 rounded-2xl flex items-center justify-center mx-auto">
          {icon || <Calendar className="h-7 w-7 text-accent-foreground" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {showCreateButton && (
          <>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('availPage.button.createCalendarEmptyState', 'Create Calendar')}
            </Button>

            <CreateCalendarDialog
              open={showCreateDialog}
              onOpenChange={setShowCreateDialog}
              onCalendarCreated={onCalendarCreated}
            />
          </>
        )}
      </div>
    </div>
  );
}