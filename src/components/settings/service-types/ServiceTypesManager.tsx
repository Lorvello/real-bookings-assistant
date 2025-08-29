import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { ServiceType } from '@/types/calendar';
import { ServiceTypeForm } from './ServiceTypeForm';
import { ServiceTypeCard } from './ServiceTypeCard';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  color: string;
  tax_enabled: boolean;
  tax_behavior: 'inclusive' | 'exclusive';
  tax_code: string;
}

const DEFAULT_FORM_DATA: ServiceTypeFormData = {
  name: '',
  description: '',
  duration: '30',
  price: '',
  color: '#3B82F6',
  tax_enabled: false,
  tax_behavior: 'exclusive',
  tax_code: ''
};

export function ServiceTypesManager() {
  const { selectedCalendar } = useCalendarContext();
  const { toast } = useToast();
  const { getStripeAccount } = useStripeConnect();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<ServiceTypeFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [taxConfigured, setTaxConfigured] = useState(false);

  const {
    serviceTypes,
    loading,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch
  } = useServiceTypes(selectedCalendar?.id);

  // Check if tax is configured for this account
  useEffect(() => {
    const checkTaxConfiguration = async () => {
      try {
        const stripeAccount = await getStripeAccount();
        setTaxConfigured(!!stripeAccount?.onboarding_completed);
      } catch (error) {
        console.error('Failed to check tax configuration:', error);
        setTaxConfigured(false);
      }
    };

    if (selectedCalendar?.id) {
      checkTaxConfiguration();
    }
  }, [selectedCalendar?.id, getStripeAccount]);

  const handleCreate = () => {
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsDialogOpen(true);
  };

  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
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
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCalendar?.id) return;

    setSaving(true);
    try {
      const serviceData = {
        calendar_id: selectedCalendar.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : null,
        color: formData.color,
        tax_enabled: formData.tax_enabled,
        tax_behavior: formData.tax_behavior,
        tax_code: formData.tax_enabled ? formData.tax_code : null,
        is_active: true,
        max_attendees: 1,
        preparation_time: 0,
        cleanup_time: 0,
        created_at: new Date().toISOString()
      };

      if (editingService) {
        await updateServiceType(editingService.id, serviceData);
        toast({
          title: "Service Updated",
          description: "Service type has been updated successfully."
        });
      } else {
        await createServiceType(serviceData);
        toast({
          title: "Service Created",
          description: "New service type has been created successfully."
        });
      }

      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Failed to save service type:', error);
      toast({
        title: "Error",
        description: "Failed to save service type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service type?')) {
      return;
    }

    try {
      await deleteServiceType(serviceId);
      toast({
        title: "Service Deleted",
        description: "Service type has been deleted successfully."
      });
      refetch();
    } catch (error) {
      console.error('Failed to delete service type:', error);
      toast({
        title: "Error",
        description: "Failed to delete service type. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading services...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>
                Manage your available services and their tax configurations
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 'Edit Service Type' : 'Create Service Type'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingService 
                      ? 'Update the details and tax configuration for this service type.'
                      : 'Create a new service type with pricing and tax configuration.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <ServiceTypeForm
                  formData={formData}
                  setFormData={setFormData}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  saving={saving}
                  isEditing={!!editingService}
                  taxConfigured={taxConfigured}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {serviceTypes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No services created yet</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create your first service
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceTypes.map((service) => (
                <ServiceTypeCard
                  key={service.id}
                  service={service}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}