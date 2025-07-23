
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useToast } from '@/hooks/use-toast';
import { ServiceType } from '@/types/database';
import { ServiceTypeForm } from '@/components/settings/service-types/ServiceTypeForm';
import { ServiceTypeCard } from '@/components/settings/service-types/ServiceTypeCard';
import { ServiceTypesEmptyState } from '@/components/settings/service-types/ServiceTypesEmptyState';
import { ServiceTypesLoadingState } from '@/components/settings/service-types/ServiceTypesLoadingState';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface ServiceTypesManagerProps {
  calendarId?: string;
}

export function ServiceTypesManager({ calendarId }: ServiceTypesManagerProps) {
  const { toast } = useToast();
  const { selectedCalendar, calendars } = useCalendarContext();
  const { serviceTypes, loading, createServiceType, updateServiceType, deleteServiceType } = useServiceTypes();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state - all numeric fields as strings for easier editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    color: '#10B981',
    max_attendees: '',
    preparation_time: '',
    cleanup_time: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      color: '#10B981',
      max_attendees: '',
      preparation_time: '',
      cleanup_time: '',
    });
    setEditingService(null);
    setShowAddModal(false);
  };

  const handleEdit = (service: ServiceType) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price?.toString() || '',
      color: service.color,
      max_attendees: service.max_attendees.toString(),
      preparation_time: service.preparation_time.toString(),
      cleanup_time: service.cleanup_time.toString(),
    });
    setEditingService(service);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const activeCalendarId = calendarId || selectedCalendar?.id;
    
    if (!activeCalendarId) {
      toast({
        title: "Error",
        description: "Please select a calendar first",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Service naam is verplicht",
        variant: "destructive",
      });
      return;
    }

    const duration = parseInt(formData.duration) || 0;
    if (duration <= 0) {
      toast({
        title: "Error", 
        description: "Duur moet groter zijn dan 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        duration: duration,
        price: formData.price === '' ? 0 : parseFloat(formData.price),
        color: formData.color,
        max_attendees: parseInt(formData.max_attendees) || 1,
        preparation_time: parseInt(formData.preparation_time) || 0,
        cleanup_time: parseInt(formData.cleanup_time) || 0,
        calendar_id: activeCalendarId,
        is_active: true,
      };

      if (editingService) {
        await updateServiceType(editingService.id, serviceData);
        toast({
          title: "Success",
          description: "Service type succesvol bijgewerkt",
        });
      } else {
        await createServiceType(serviceData);
        toast({
          title: "Success", 
          description: "Service type succesvol aangemaakt",
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving service type:', error);
      toast({
        title: "Error",
        description: "Kon service type niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, serviceName: string) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je "${serviceName}" wilt verwijderen?\n\n` +
      'Let op: Dit kan invloed hebben op bestaande boekingen die gebruik maken van deze service. ' +
      'Bestaande boekingen blijven bestaan, maar nieuwe boekingen kunnen niet meer worden gemaakt voor deze service.\n\n' +
      'Deze actie kan niet ongedaan worden gemaakt.'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await deleteServiceType(id);
      toast({
        title: "Success",
        description: `Service "${serviceName}" succesvol verwijderd`,
      });
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: "Error",
        description: "Kon service type niet verwijderen. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <ServiceTypesLoadingState />;
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">
            Services
            {!selectedCalendar && calendars.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Select a calendar to manage services)
              </span>
            )}
          </CardTitle>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={!selectedCalendar && calendars.length > 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add/Edit Form */}
        {showAddModal && (
          <ServiceTypeForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onCancel={resetForm}
            saving={saving}
            isEditing={!!editingService}
          />
        )}

        {/* Services List */}
        {serviceTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {serviceTypes.map((service) => (
               <ServiceTypeCard
                 key={service.id}
                 service={service}
                 onEdit={handleEdit}
                 onDelete={(id) => handleDelete(id, service.name)}
               />
             ))}
          </div>
        ) : (
          <>
            {selectedCalendar || calendars.length === 0 ? (
              <ServiceTypesEmptyState onAddService={() => setShowAddModal(true)} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please select a calendar to view or manage services
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
