import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { ServiceTypeForm } from './ServiceTypeFormNew';
import { ServiceTypeCard } from './ServiceTypeCard';
import { ServiceTypesEmptyState } from './ServiceTypesEmptyState';
import { ServiceTypeInstallmentConfig } from './ServiceTypeInstallmentConfig';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useTaxConfiguration } from '@/hooks/useTaxConfiguration';
import { useInstallmentSettings } from '@/hooks/useInstallmentSettings';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useTeamMemberServices } from '@/hooks/useTeamMemberServices';
import type { ServiceType } from '@/types/database';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  tax_enabled: boolean;
  tax_behavior: 'inclusive' | 'exclusive';
  applicable_tax_rate: number;
  tax_rate_type: string;
  service_category: string;
}

const DEFAULT_FORM_DATA: ServiceTypeFormData = {
  name: '',
  description: '',
  duration: 30,
  price: 0,
  color: '#3B82F6',
  tax_enabled: false,
  tax_behavior: 'exclusive',
  applicable_tax_rate: 21,
  tax_rate_type: 'standard',
  service_category: 'general'
};

export function ServiceTypesManager() {
  const { selectedCalendar } = useCalendarContext();
  const { toast } = useToast();
  const { stripeAccount } = useStripeConnect();
  const { taxConfiguration, hasCompleteTaxConfig } = useTaxConfiguration();
  const { getInstallmentConfig, updateInstallmentConfig } = useInstallmentSettings();
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingService, setDeletingService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<ServiceTypeFormData>(DEFAULT_FORM_DATA);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [userTaxBehavior, setUserTaxBehavior] = useState<'inclusive' | 'exclusive' | null>(null);
  const [installmentConfigService, setInstallmentConfigService] = useState<ServiceType | null>(null);

  const { serviceTypes, loading, createServiceType, updateServiceType, deleteServiceType, refetch } = useServiceTypes(selectedCalendar?.id);
  const { assignMultipleMembers, services: teamMemberServices } = useTeamMemberServices(selectedCalendar?.id);

  const handleCreate = () => {
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
    setSelectedTeamMembers([]);
    setShowDialog(true);
  };

  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price || 0,
      color: service.color || '#3B82F6',
      tax_enabled: service.tax_enabled || false,
      tax_behavior: service.tax_behavior || 'exclusive',
      applicable_tax_rate: service.applicable_tax_rate || 21,
      tax_rate_type: service.tax_rate_type || 'standard',
      service_category: service.service_category || 'general'
    });
    
    // Load existing team member assignments
    const existingAssignments = teamMemberServices
      .filter(tms => tms.service_type_id === service.id)
      .map(tms => tms.user_id);
    setSelectedTeamMembers(existingAssignments);
    
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!selectedCalendar?.id) return;

    setSaving(true);
    try {
      if (editingService) {
        await updateServiceType({
          ...editingService,
          ...formData
        });
        
        // Sync team member assignments for edited service
        if (selectedCalendar?.id && selectedTeamMembers.length > 0) {
          const existingAssignments = teamMemberServices
            .filter(tms => tms.service_type_id === editingService.id)
            .map(tms => tms.user_id);
          
          const toAdd = selectedTeamMembers.filter(id => !existingAssignments.includes(id));
          if (toAdd.length > 0) {
            await assignMultipleMembers(editingService.id, toAdd, selectedCalendar.id);
          }
        }
        
        toast({
          title: "Service updated",
          description: "Service type has been updated successfully"
        });
      } else {
        const newService = await createServiceType(formData);
        
        // Assign team members to newly created service
        if (newService && selectedCalendar?.id && selectedTeamMembers.length > 0) {
          await assignMultipleMembers(newService.id, selectedTeamMembers, selectedCalendar.id);
        }
        
        toast({
          title: "Service created",
          description: "Service type has been created successfully"
        });
      }
      
      await refetch();
      handleClose();
    } catch (error) {
      console.error('Error saving service type:', error);
      toast({
        title: "Error",
        description: "Failed to save service type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
    setSelectedTeamMembers([]);
    setSaving(false);
  };

  const handleDelete = (service: ServiceType) => {
    setDeletingService(service);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingService) return;
    
    try {
      await deleteServiceType(deletingService.id);
      toast({
        title: "Service deleted",
        description: "Service type has been deleted successfully"
      });
      await refetch();
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: "Error",
        description: "Failed to delete service type. Please try again.",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletingService(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingService(null);
  };

  const handleInstallmentConfig = (service: ServiceType) => {
    setInstallmentConfigService(service);
  };

  const handleInstallmentUpdate = async (serviceId: string, enabled: boolean, plan?: any) => {
    try {
      await updateServiceType({
        id: serviceId,
        installments_enabled: enabled,
        custom_installment_plan: plan || null
      } as any);

      toast({
        title: "Installment settings updated",
        description: "Service installment configuration has been updated successfully"
      });
      
      setInstallmentConfigService(null);
      await refetch();
    } catch (error) {
      console.error('Error updating installment settings:', error);
      toast({
        title: "Error",
        description: "Failed to update installment settings. Please try again.",
        variant: "destructive"
      });
    }
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

  const getCalendarName = (calendarId: string | null | undefined) => {
    // Implementation depends on your calendar context
    return "Calendar";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>
                Manage the services you offer and assign team members
              </CardDescription>
              {!hasCompleteTaxConfig && (
                <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
                  <p className="text-sm text-warning-foreground">
                    Complete tax configuration in Tax Settings to enable tax on services
                  </p>
                </div>
              )}
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {serviceTypes.length === 0 ? (
            <ServiceTypesEmptyState onCreateService={handleCreate} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceTypes.map((service) => (
                <ServiceTypeCard
                  key={service.id}
                  service={service}
                  calendarName={getCalendarName(service.calendar_id)}
                  onEdit={() => handleEdit(service)}
                  onDelete={() => handleDelete(service)}
                  onInstallmentConfig={() => handleInstallmentConfig(service)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service Type' : 'Create Service Type'}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? 'Update service details and team member assignments'
                : 'Create a new service type and assign team members'}
            </DialogDescription>
          </DialogHeader>
          
          <ServiceTypeForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onCancel={handleClose}
            saving={saving}
            isEditing={!!editingService}
            userTaxBehavior={userTaxBehavior}
            hasCompleteTaxConfig={hasCompleteTaxConfig}
            calendarId={selectedCalendar?.id}
            selectedTeamMembers={selectedTeamMembers}
            onTeamMembersChange={setSelectedTeamMembers}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Type?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingService?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Installment Configuration Dialog */}
      {installmentConfigService && (
        <Dialog open={!!installmentConfigService} onOpenChange={() => setInstallmentConfigService(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Installment Settings</DialogTitle>
              <DialogDescription>
                Configure installment payment options for {installmentConfigService.name}
              </DialogDescription>
            </DialogHeader>
            <ServiceTypeInstallmentConfig
              serviceType={installmentConfigService}
              onUpdate={(updates: any) => {
                if ('installments_enabled' in updates || 'custom_installment_plan' in updates) {
                  handleInstallmentUpdate(
                    installmentConfigService.id,
                    updates.installments_enabled || false,
                    updates.custom_installment_plan
                  );
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
