import React, { useState } from 'react';
import { ServiceTypesManager } from '@/components/settings/service-types/ServiceTypesManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Plus } from 'lucide-react';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export function ServicesTab() {
  const { calendars } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (calendars.length === 0) {
    return (
      <>
        <SettingsSection
          icon={CalendarPlus}
          title="Services"
          description="Services are added to a calendar. Create your first calendar to start adding services."
          flush
        >
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.10] text-accent-foreground">
              <CalendarPlus className="h-6 w-6" />
            </div>
            <h3 className="mb-1.5 text-base font-semibold text-foreground">No calendar yet</h3>
            <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
              You don't have any calendars yet. Create a calendar first, then you can add the
              services customers can book.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add calendar
            </Button>
          </div>
        </SettingsSection>

        <CreateCalendarDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          trigger="button"
        />
      </>
    );
  }

  return <ServiceTypesManager />;
}
