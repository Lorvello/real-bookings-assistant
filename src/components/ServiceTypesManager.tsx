
import React, { useState } from 'react';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceTypesEmptyState } from '@/components/settings/service-types/ServiceTypesEmptyState';
import { ServiceTypeQuickCreateDialog } from '@/components/calendar-switcher/ServiceTypeQuickCreateDialog';

interface ServiceTypesManagerProps {
  calendarId?: string;
  showCalendarLabels?: boolean;
}

export const ServiceTypesManager: React.FC<ServiceTypesManagerProps> = ({ 
  calendarId,
  showCalendarLabels = false 
}) => {
  const { calendars, selectedCalendar } = useCalendarContext();
  const { serviceTypes, loading, refetch } = useServiceTypes(calendarId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const getCalendarName = (id: string) => {
    return calendars.find(cal => cal.id === id)?.name || 'Unknown Calendar';
  };

  if (loading) {
    return <div>Loading service types...</div>;
  }

  return (
    <div>
      {serviceTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceTypes.map(service => (
            <div 
              key={service.id} 
              className="bg-gray-900 p-4 rounded-lg border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-white font-medium">{service.name}</h3>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: service.color }}
                />
              </div>
              {showCalendarLabels && (
                <div className="mt-1 text-xs text-gray-400">
                  {getCalendarName(service.calendar_id)}
                </div>
              )}
              <p className="text-sm text-gray-400 mt-2">
                Duration: {service.duration} minutes
              </p>
              {service.price && (
                <p className="text-sm text-gray-400">
                  Price: €{service.price}
                </p>
              )}
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                {service.description || 'No description'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <ServiceTypesEmptyState 
          onAddService={() => setShowCreateDialog(true)} 
        />
      )}
      
      {showCreateDialog && (
        <ServiceTypeQuickCreateDialog
          onServiceCreated={(serviceId) => {
            setShowCreateDialog(false);
            refetch();
          }}
          trigger={null}
        />
      )}
    </div>
  );
};
