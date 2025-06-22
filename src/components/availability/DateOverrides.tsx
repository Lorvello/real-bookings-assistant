
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

interface DateOverridesProps {
  calendarId: string;
  onChange?: () => void;
}

export function DateOverrides({ calendarId, onChange }: DateOverridesProps) {
  const [overrides, setOverrides] = useState<any[]>([]);

  return (
    <div className="p-4">
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Geen uitzonderingen
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Voeg specifieke datums toe met afwijkende beschikbaarheid
        </p>
        <Button
          variant="outline"
          size="sm"
          className="bg-background/50 border-border/60 hover:bg-accent/50"
          onClick={() => {
            // TODO: Implement add override functionality
            onChange?.();
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Uitzondering toevoegen
        </Button>
      </div>
    </div>
  );
}
