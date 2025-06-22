
import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceType } from '@/types/database';

interface ServiceTypeItemProps {
  serviceType: ServiceType;
  onEdit: (serviceType: ServiceType) => void;
  onDelete: (id: string) => void;
}

export const ServiceTypeItem: React.FC<ServiceTypeItemProps> = ({
  serviceType,
  onEdit,
  onDelete
}) => {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: serviceType.color }}
          />
          <div>
            <h3 className="text-white font-medium">{serviceType.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
              <span>{formatDuration(serviceType.duration)}</span>
              {serviceType.price && <span>€{serviceType.price.toFixed(2)}</span>}
              <span>{serviceType.max_attendees} persoon(en)</span>
              <Badge variant={serviceType.is_active ? "default" : "secondary"}>
                {serviceType.is_active ? "Actief" : "Inactief"}
              </Badge>
            </div>
            {serviceType.description && (
              <p className="text-gray-400 text-sm mt-1">{serviceType.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(serviceType)}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(serviceType.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
