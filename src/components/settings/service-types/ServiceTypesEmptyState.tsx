
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceTypesEmptyStateProps {
  onAddService: () => void;
}

export function ServiceTypesEmptyState({ onAddService }: ServiceTypesEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Geen services gevonden</h3>
      <p className="text-muted-foreground mb-4">
        Voeg je eerste service toe om boekingen te kunnen ontvangen
      </p>
      <Button 
        onClick={onAddService}
        className="bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        Eerste Service Toevoegen
      </Button>
    </div>
  );
}
