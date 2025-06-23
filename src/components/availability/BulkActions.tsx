
import React from 'react';
import { Button } from '@/components/ui/button';
import { AvailabilityRule } from '@/types/database';

interface BulkActionsProps {
  onBulkUpdate: (updates: Partial<AvailabilityRule>) => Promise<void>;
}

export function BulkActions({ onBulkUpdate }: BulkActionsProps) {
  return (
    <div className="bg-background-secondary rounded-lg p-6 border border-border">
      <h3 className="text-lg font-medium text-foreground mb-4">
        Bulk Actions
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={() => onBulkUpdate({ is_available: true })}
          className="border-border"
        >
          Make all days available
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onBulkUpdate({ is_available: false })}
          className="border-border"
        >
          Make all days unavailable
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onBulkUpdate({ 
            start_time: '09:00', 
            end_time: '17:00' 
          })}
          className="border-border"
        >
          Standard hours (9:00-17:00)
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onBulkUpdate({ 
            start_time: '08:00', 
            end_time: '18:00' 
          })}
          className="border-border"
        >
          Extended hours (8:00-18:00)
        </Button>
      </div>
    </div>
  );
}
