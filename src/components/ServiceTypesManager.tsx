
import React, { useState } from 'react';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceTypesEmptyState } from '@/components/settings/service-types/ServiceTypesEmptyState';
import { ServiceTypeForm } from '@/components/settings/service-types/ServiceTypeForm';
import { ServiceTypeCard } from '@/components/settings/service-types/ServiceTypeCard';
import { ServiceTypeStripeConfig } from '@/components/settings/service-types/ServiceTypeStripeConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ServiceTypesManagerProps {
  // No props needed - always show all user service types
}

export const ServiceTypesManager: React.FC<ServiceTypesManagerProps> = () => {
  const { calendars } = useCalendarContext();
  const { serviceTypes, loading, refetch, createServiceType, updateServiceType, deleteServiceType } = useServiceTypes();
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    color: '#3B82F6',
    tax_enabled: false,
    tax_behavior: 'exclusive' as 'inclusive' | 'exclusive',
    tax_code: ''
  });

  const getCalendarName = (id: string) => {
    return calendars.find(cal => cal.id === id)?.name || 'Unknown Calendar';
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      if (editingService) {
        // Update existing service
        await updateServiceType(editingService.id, {
          name: formData.name,
          description: formData.description,
          duration: parseInt(formData.duration) || 30,
          price: parseFloat(formData.price) || undefined,
          color: formData.color
        });
      } else {
        // Create new service (global, not calendar-specific)
        await createServiceType({
          name: formData.name,
          description: formData.description,
          duration: parseInt(formData.duration) || 30,
          price: parseFloat(formData.price) || undefined,
          color: formData.color,
          is_active: true,
          max_attendees: 1,
          preparation_time: 0,
          cleanup_time: 0,
          tax_enabled: formData.tax_enabled,
          tax_behavior: formData.tax_behavior,
          tax_code: formData.tax_code,
          created_at: new Date().toISOString(),
          calendar_id: null // Global service, not tied to specific calendar
        });
      }
      
      handleClose();
      refetch();
    } catch (error) {
      console.error('Error saving service type:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      color: '#3B82F6',
      tax_enabled: false,
      tax_behavior: 'exclusive',
      tax_code: ''
    });
    setEditingService(null);
    setShowDialog(false);
  };

  const handleEdit = (service: any) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price?.toString() || '',
      color: service.color,
      tax_enabled: service.tax_enabled || false,
      tax_behavior: service.tax_behavior || 'exclusive',
      tax_code: service.tax_code || ''
    });
    setEditingService(service);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      duration: '',
      price: '',
      color: '#3B82F6',
      tax_enabled: false,
      tax_behavior: 'exclusive',
      tax_code: ''
    });
    setEditingService(null);
    setShowDialog(true);
  };

  const handleDelete = (serviceId: string) => {
    setDeletingService(serviceId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deletingService) {
      try {
        await deleteServiceType(deletingService);
        refetch();
      } catch (error) {
        console.error('Error deleting service type:', error);
      } finally {
        setShowDeleteDialog(false);
        setDeletingService(null);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingService(null);
  };

  if (loading) {
    return <div>Loading service types...</div>;
  }

  return (
    <div className="space-y-4">{/* Fixed showCreateDialog reference issue */}
      {serviceTypes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceTypes.map(service => (
              <ServiceTypeCard
                key={service.id}
                service={service}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleCreate}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service Type
            </Button>
          </div>
        </>
      ) : (
        <ServiceTypesEmptyState 
          onAddService={handleCreate} 
        />
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <ServiceTypeForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleSave}
              onCancel={handleClose}
              saving={saving}
              isEditing={!!editingService}
            />
            
            {editingService && (
              <ServiceTypeStripeConfig
                serviceType={editingService}
                onUpdate={(updates) => {
                  updateServiceType(editingService.id, updates);
                  setEditingService(prev => prev ? { ...prev, ...updates } : null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this service type. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
