
import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { AvailabilityRule } from '@/types/database';

interface WeekActionsProps {
  onCopyWeek: () => void;
  onPasteWeek: () => void;
  hasCopiedWeek: boolean;
}

export function WeekActions({ onCopyWeek, onPasteWeek, hasCopiedWeek }: WeekActionsProps) {
  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onCopyWeek}
        className="border-border"
      >
        <Copy className="h-4 w-4 mr-1" />
        Copy Week
      </Button>
      
      {hasCopiedWeek && (
        <Button
          variant="outline" 
          size="sm"
          onClick={onPasteWeek}
          className="border-border"
        >
          Paste Week
        </Button>
      )}
    </div>
  );
}
