
import React from 'react';
import { Clock, Euro, Users, Edit, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceType } from '@/types/database';

interface ServiceTypeCardProps {
  service: ServiceType;
  onEdit: (service: ServiceType) => void;
  onDelete: (id: string) => void;
}

export function ServiceTypeCard({ service, onEdit, onDelete }: ServiceTypeCardProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'Gratis';
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  return (
    <div className="bg-background-secondary rounded-lg p-4 border border-border hover:border-primary/50 transition-colors group">
      {/* Service Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: service.color }}
          />
          <h3 className="text-foreground font-medium truncate">{service.name}</h3>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(service)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(service.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Service Description */}
      {service.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {service.description}
        </p>
      )}

      {/* Service Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Duur:</span>
          </div>
          <span className="text-foreground font-medium">
            {formatDuration(service.duration)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-muted-foreground">
            <Euro className="h-4 w-4 mr-1" />
            <span>Prijs:</span>
          </div>
          <span className="text-foreground font-medium">
            {formatPrice(service.price)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-1" />
            <span>Max personen:</span>
          </div>
          <span className="text-foreground font-medium">
            {service.max_attendees}
          </span>
        </div>
      </div>

      {/* Service Status & WhatsApp */}
      <div className="mt-4 pt-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={service.is_active ? "default" : "secondary"}>
            {service.is_active ? "Actief" : "Inactief"}
          </Badge>
          
          {(service.preparation_time > 0 || service.cleanup_time > 0) && (
            <div className="text-xs text-muted-foreground">
              {service.preparation_time > 0 && `${service.preparation_time}min voorbereiding`}
              {service.preparation_time > 0 && service.cleanup_time > 0 && " • "}
              {service.cleanup_time > 0 && `${service.cleanup_time}min opruimen`}
            </div>
          )}
        </div>

        {/* WhatsApp Availability Indicator */}
        <div className="flex items-center text-xs text-whatsapp">
          <MessageCircle className="h-4 w-4 mr-1" />
          <span>Beschikbaar via WhatsApp</span>
        </div>
      </div>
    </div>
  );
}
