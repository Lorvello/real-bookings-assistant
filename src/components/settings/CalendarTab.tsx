
import React from 'react';
import { CalendarSettings } from '@/components/CalendarSettings';
import { ServiceTypesManager } from '@/components/ServiceTypesManager';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save } from 'lucide-react';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { Separator } from '@/components/ui/separator';

export function CalendarTab() {
  const { selectedCalendar, calendars } = useCalendarContext();
  const { saving, hasPendingChanges, saveAllChanges } = useCalendarSettings(selectedCalendar?.id);

  const handleSave = async () => {
    if (!hasPendingChanges || saving) return;
    await saveAllChanges();
  };

  if (calendars.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calendar found</h3>
            <p className="text-muted-foreground">
              You don't have any calendars yet. Create a calendar first to modify settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!selectedCalendar) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calendar selected</h3>
            <p className="text-muted-foreground">
              Select a calendar to modify settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <Save className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-white font-medium">Save Changes</p>
            <p className="text-gray-400 text-sm">
              {hasPendingChanges 
                ? 'You have unsaved changes' 
                : 'All changes saved'
              }
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasPendingChanges}
          className={`font-medium px-6 py-2 rounded-lg transition-all duration-200 ${
            hasPendingChanges && !saving
              ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          {saving ? 'Saving...' : 'Save Calendar Settings'}
        </Button>
      </div>
      
      <CalendarSettings calendarId={selectedCalendar.id} />

      <Separator />

      {/* Service Types Section */}
      <ServiceTypesManager calendarId={selectedCalendar.id} />
    </div>
  );
}
