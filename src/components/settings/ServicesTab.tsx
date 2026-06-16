
import React, { useState } from 'react';
import { ServiceTypesManager } from '@/components/settings/service-types/ServiceTypesManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export function ServicesTab() {
  const { calendars } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (calendars.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center text-center">
              <div className="glow-accent relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <AlertCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No calendar found</h3>
               <p className="text-muted-foreground mb-6">
                 You don't have any calendars yet. Create a calendar first to manage services.
               </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className=""
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <CreateCalendarDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          trigger="button"
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Global Services Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage all your business services. These can be assigned to any calendar when creating or editing calendars.
          </p>
        </CardHeader>
        <CardContent>
          <ServiceTypesManager />
        </CardContent>
      </Card>
    </div>
  );
}
