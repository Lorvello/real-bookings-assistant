import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarSettings } from '@/components/CalendarSettings';

interface CalendarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  calendarName?: string;
}

export function CalendarSettingsDialog({
  open,
  onOpenChange,
  calendarId,
  calendarName
}: CalendarSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Calendar Settings - {calendarName || 'Calendar'}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-6">
          <CalendarSettings calendarId={calendarId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}