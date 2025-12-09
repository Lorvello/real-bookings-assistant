import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { ServiceTypeForm } from './ServiceTypeForm';
import { ServiceTypeCard } from './ServiceTypeCard';
import { ServiceTypesEmptyState } from './ServiceTypesEmptyState';
import { ServiceTypeInstallmentConfig } from './ServiceTypeInstallmentConfig';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import { useTaxConfiguration } from '@/hooks/useTaxConfiguration';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useTeamMemberServices } from '@/hooks/useTeamMemberServices';
import type { ServiceType } from '@/types/database';
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
  price: '0',
  color: '#3B82F6',
  tax_enabled: false,
  tax_behavior: 'exclusive',
  tax_code: ''
};
export function ServiceTypesManager() {
  const {
    selectedCalendar,
    calendars,
    refreshCalendars
  } = useCalendarContext();
  const {
    toast
  } = useToast();
  const {
    status: taxStatus
  } = useTaxConfiguration(selectedCalendar?.id);
  const hasCompleteTaxConfig = taxStatus?.isFullyConfigured || false;
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingService, setDeletingService] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<ServiceTypeFormData>(DEFAULT_FORM_DATA);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [installmentConfigService, setInstallmentConfigService] = useState<ServiceType | null>(null);
  
  // State for calendar selection in the form
  const [targetCalendarId, setTargetCalendarId] = useState<string | null>(
    selectedCalendar?.id || calendars[0]?.id || null
  );
  
  const {
    serviceTypes,
    loading,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch
  } = useServiceTypes(selectedCalendar?.id);
  const {
    assignMultipleMembers,
    services: teamMemberServices
  } = useTeamMemberServices(selectedCalendar?.id);
  
  const handleCreate = () => {
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
    setSelectedTeamMembers([]);
    // Reset to current calendar or first available
    setTargetCalendarId(selectedCalendar?.id || calendars[0]?.id || null);
    setShowDialog(true);
  };
  const handleEdit = (service: ServiceType) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: (service.price || 0).toString(),
      color: service.color || '#3B82F6',
      tax_enabled: (service as any).tax_enabled || false,
      tax_behavior: (service as any).tax_behavior || 'exclusive',
      tax_code: (service as any).tax_code || ''
    });

    // Load existing team member assignments
    const existingAssignments = teamMemberServices.filter(tms => tms.service_type_id === service.id).map(tms => tms.user_id);
    setSelectedTeamMembers(existingAssignments);
    setShowDialog(true);
  };
  const handleSave = async () => {
    const calendarIdToUse = targetCalendarId || selectedCalendar?.id || calendars[0]?.id;
    
    if (!calendarIdToUse) {
      toast({
        title: "Geen kalender beschikbaar",
        description: "Selecteer of maak eerst een kalender aan.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      if (editingService) {
        await updateServiceType(editingService.id, {
          name: formData.name,
          description: formData.description,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          color: formData.color
        } as any);

        // Sync team member assignments for edited service
        if (selectedCalendar?.id && selectedTeamMembers.length > 0) {
          const existingAssignments = teamMemberServices.filter(tms => tms.service_type_id === editingService.id).map(tms => tms.user_id);
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
        const serviceData = {
          calendar_id: calendarIdToUse,
          name: formData.name,
          description: formData.description,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          color: formData.color,
          is_active: true,
          tax_enabled: formData.tax_enabled,
          tax_behavior: formData.tax_behavior,
          tax_code: formData.tax_code || null
        };
        const newService = await createServiceType(serviceData as any);

        // Assign team members to newly created service
        if (newService && calendarIdToUse && selectedTeamMembers.length > 0) {
          await assignMultipleMembers(newService.id, selectedTeamMembers, calendarIdToUse);
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
    setTargetCalendarId(selectedCalendar?.id || calendars[0]?.id || null);
    setSaving(false);
  };
  
  const handleCalendarCreated = async (calendar: any) => {
    // Refresh calendars list in context
    await refreshCalendars();
    // Set the newly created calendar as the target
    setTargetCalendarId(calendar.id);
  };
  const handleDelete = (service: ServiceType) => {
    setDeletingService(service);
    setShowDeleteDialog(true);
  };
  const confirmDelete = async () => {
    if (!deletingService?.id) return;
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
      await updateServiceType(serviceId, {
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
    return <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading services...</p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Types</CardTitle>
              <CardDescription>
                Manage the services you offer and assign team members
              </CardDescription>
              {!hasCompleteTaxConfig}
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {serviceTypes.length === 0 ? <ServiceTypesEmptyState onAddService={handleCreate} /> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceTypes.map(service => <ServiceTypeCard key={service.id} service={service} onEdit={() => handleEdit(service)} onDelete={() => handleDelete(service)} onInstallmentConfig={() => handleInstallmentConfig(service)} />)}
            </div>}
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
              {editingService ? 'Update service details and team member assignments' : 'Create a new service type and assign team members'}
            </DialogDescription>
          </DialogHeader>
          
          <ServiceTypeForm formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={handleClose} saving={saving} isEditing={!!editingService} taxConfigured={hasCompleteTaxConfig} calendarId={targetCalendarId || selectedCalendar?.id} selectedTeamMembers={selectedTeamMembers} onTeamMembersChange={setSelectedTeamMembers} calendars={calendars} selectedCalendarId={targetCalendarId} onCalendarSelect={setTargetCalendarId} onCalendarCreated={handleCalendarCreated} />
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
      {installmentConfigService && <Dialog open={!!installmentConfigService} onOpenChange={() => setInstallmentConfigService(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Installment Settings</DialogTitle>
              <DialogDescription>
                Configure installment payment options for {installmentConfigService.name}
              </DialogDescription>
            </DialogHeader>
            <ServiceTypeInstallmentConfig serviceType={installmentConfigService} businessInstallmentsEnabled={false} businessDefaultPlan={null} onUpdate={(updates: any) => {
          if ('installments_enabled' in updates || 'custom_installment_plan' in updates) {
            handleInstallmentUpdate(installmentConfigService.id, updates.installments_enabled || false, updates.custom_installment_plan);
          }
        }} />
          </DialogContent>
        </Dialog>}
    </div>;
}