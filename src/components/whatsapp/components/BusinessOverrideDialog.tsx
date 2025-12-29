import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetBusinessOverride } from '@/hooks/useWhatsAppBusinessOverride';

interface BusinessOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  currentBusiness?: string;
}

export function BusinessOverrideDialog({
  open,
  onOpenChange,
  contactId,
  currentBusiness,
}: BusinessOverrideDialogProps) {
  const [businessName, setBusinessName] = useState(currentBusiness || '');
  const setOverride = useSetBusinessOverride();

  const handleSave = async () => {
    if (!businessName.trim()) return;
    
    await setOverride.mutateAsync({
      contactId,
      businessName: businessName.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Business koppelen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business naam</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Bijv. Brand Evolves"
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Deze koppeling blijft behouden, ook na data refresh.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!businessName.trim() || setOverride.isPending}
          >
            {setOverride.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
