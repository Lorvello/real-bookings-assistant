
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
        <p>No service types added yet</p>
        <p className="text-sm">Add your first service to get started</p>
      </div>
    </div>
  );
};
