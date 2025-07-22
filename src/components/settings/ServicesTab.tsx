
import React, { useState } from 'react';
import { ServiceTypesManager } from '@/components/ServiceTypesManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export function ServicesTab() {
  const { selectedCalendar, calendars } = useCalendarContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (calendars.length === 0) {
    return (
      <>
        <Card 
          className="border-gray-700"
          style={{ backgroundColor: '#0F172A' }}
        >
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No calendar found</h3>
               <p className="text-muted-foreground mb-6">
                 You don't have any calendars yet. Create a calendar first to manage services.
               </p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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

  if (!selectedCalendar) {
    return (
      <Card 
        className="border-gray-700"
        style={{ backgroundColor: '#0F172A' }}
      >
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calendar selected</h3>
             <p className="text-muted-foreground">
               Select a calendar to manage services.
             </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ServiceTypesManager calendarId={selectedCalendar.id} />
    </div>
  );
}
