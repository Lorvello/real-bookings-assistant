
import React from 'react';
import { Plus } from 'lucide-react';

interface ServiceTypesEmptyStateProps {
  onAddService: () => void;
}

export const ServiceTypesEmptyState: React.FC<ServiceTypesEmptyStateProps> = ({
  onAddService
}) => {
  return (
    <div className="text-center py-8">
      <div className="text-gray-400 mb-4">
        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nog geen service types toegevoegd</p>
        <p className="text-sm">Voeg je eerste service toe om te beginnen</p>
      </div>
    </div>
  );
};
