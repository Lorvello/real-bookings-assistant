
import React from 'react';
import { Button } from '@/components/ui/button';

interface BookingFormActionsProps {
  onClose: () => void;
  isCreating: boolean;
}

export function BookingFormActions({ onClose, isCreating }: BookingFormActionsProps) {
  return (
    <div className="flex justify-end space-x-2 pt-4 border-t border-border">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
