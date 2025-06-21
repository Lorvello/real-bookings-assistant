
import React from 'react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onWeekdaySchedule: () => void;
  onFullWeekSchedule: () => void;
  onCloseAllDays: () => void;
}

export function QuickActions({
  onWeekdaySchedule,
  onFullWeekSchedule,
  onCloseAllDays
}: QuickActionsProps) {
  return (
    <div className="mt-6 pt-4 border-t border-border">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onWeekdaySchedule}
          className="border-border"
        >
          Ma-Vr 9:00-17:00
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onFullWeekSchedule}
          className="border-border"
        >
          Alle dagen 8:00-18:00
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onCloseAllDays}
          className="border-border"
        >
          Alle dagen sluiten
        </Button>
      </div>
    </div>
  );
}
