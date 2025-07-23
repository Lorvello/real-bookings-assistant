
import React, { useState } from 'react';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceTypesEmptyState } from '@/components/settings/service-types/ServiceTypesEmptyState';
import { ServiceTypeForm } from '@/components/settings/service-types/ServiceTypeForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ServiceTypesManagerProps {
  calendarId?: string;
  showCalendarLabels?: boolean;
}

export const ServiceTypesManager: React.FC<ServiceTypesManagerProps> = ({ 
  calendarId,
  showCalendarLabels = false 
}) => {
  const { calendars, selectedCalendar } = useCalendarContext();
  const { serviceTypes, loading, refetch, createServiceType } = useServiceTypes(calendarId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    color: '#3B82F6'
  });

  const getCalendarName = (id: string) => {
    return calendars.find(cal => cal.id === id)?.name || 'Unknown Calendar';
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      await createServiceType({
        calendar_id: calendarId || selectedCalendar?.id || '',
        name: formData.name,
        description: formData.description,
        duration: parseInt(formData.duration) || 30,
        price: parseFloat(formData.price) || undefined,
        color: formData.color,
        is_active: true,
        max_attendees: 1,
        preparation_time: 0,
        cleanup_time: 0,
        created_at: new Date().toISOString()
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        duration: '',
        price: '',
        color: '#3B82F6'
      });
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      console.error('Error creating service type:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      color: '#3B82F6'
    });
    setShowCreateDialog(false);
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
      
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>
          <ServiceTypeForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
