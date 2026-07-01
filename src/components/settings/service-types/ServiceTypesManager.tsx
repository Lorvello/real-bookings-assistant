import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Tag } from 'lucide-react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ServiceTypeForm } from './ServiceTypeForm';
import { ServiceTypeCard } from './ServiceTypeCard';
import { ServiceTypesEmptyState } from './ServiceTypesEmptyState';
import { ServiceTypesLoadingState } from './ServiceTypesLoadingState';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
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
  // Buffer minutes before/after the appointment — get_available_slots uses these in
  // the conflict check, but the form never exposed them so they were stuck at 0.
  preparation_time: string;
  cleanup_time: string;
}
const DEFAULT_FORM_DATA: ServiceTypeFormData = {
  name: '',
  description: '',
  duration: '30',
  price: '0',
  // Default to the brand emerald (in the SERVICE_COLORS palette) so a new service's
  // colour dot is on-brand by default instead of a generic blue; the user can still
  // pick any palette hue to colour-code their services on the calendar.
  color: '#10B981',
  tax_enabled: false,
  tax_behavior: 'exclusive',
  tax_code: '',
  preparation_time: '0',
  cleanup_time: '0'
};
export function ServiceTypesManager() {
  const { t } = useTranslation('settings');
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
  // Count of upcoming bookings still attached to the service being deleted, so the
  // confirm dialog can WARN the owner instead of silently retiring a service that has
  // future appointments (FQ-A-DIENSTEN). Delete is a soft-delete (is_deleted=true) so
  // existing bookings keep their reference and are never orphaned; this just makes the
  // consequence explicit before they confirm.
  const [futureBookingCount, setFutureBookingCount] = useState<number | null>(null);
  const [formData, setFormData] = useState<ServiceTypeFormData>(DEFAULT_FORM_DATA);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  
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
    unassignService,
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
      color: service.color || '#10B981',
      tax_enabled: (service as any).tax_enabled || false,
      tax_behavior: (service as any).tax_behavior || 'exclusive',
      tax_code: (service as any).tax_code || '',
      preparation_time: ((service as any).preparation_time ?? 0).toString(),
      cleanup_time: ((service as any).cleanup_time ?? 0).toString()
    });

    // Set the calendar ID from the service being edited
    setTargetCalendarId((service as any).calendar_id || selectedCalendar?.id || null);

    // Load existing team member assignments
    const existingAssignments = teamMemberServices.filter(tms => tms.service_type_id === service.id).map(tms => tms.user_id);
    setSelectedTeamMembers(existingAssignments);
    setShowDialog(true);
  };
  const handleSave = async () => {
    const calendarIdToUse = targetCalendarId || selectedCalendar?.id || calendars[0]?.id;
    
    if (!calendarIdToUse) {
      toast({
        title: t('settings.services.noCalendarAvailableError', 'No calendar available'),
        description: t('settings.services.noCalendarAvailableErrorDesc', 'Please select or create a calendar first.'),
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      if (editingService) {
        await updateServiceType(editingService.id, {
          calendar_id: calendarIdToUse,
          name: formData.name,
          description: formData.description,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          color: formData.color,
          preparation_time: parseInt(formData.preparation_time) || 0,
          cleanup_time: parseInt(formData.cleanup_time) || 0
        } as any);

        // Sync team member assignments for edited service (add AND remove).
        // Previously only additions were applied — de-selecting a member on edit
        // silently left them assigned, and de-selecting all was skipped entirely
        // by the length>0 guard.
        if (calendarIdToUse) {
          const existing = teamMemberServices.filter(tms => tms.service_type_id === editingService.id);
          const existingUserIds = existing.map(tms => tms.user_id);
          const toAdd = selectedTeamMembers.filter(id => !existingUserIds.includes(id));
          const toRemove = existing.filter(tms => !selectedTeamMembers.includes(tms.user_id));
          if (toAdd.length > 0) {
            await assignMultipleMembers(editingService.id, toAdd, calendarIdToUse);
          }
          for (const tms of toRemove) {
            await unassignService(tms.id);
          }
        }
        toast({
          title: t('settings.services.serviceUpdatedToastTitle', 'Service updated'),
          description: t('settings.services.serviceUpdatedToastDesc', 'Service type has been updated successfully')
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
          tax_code: formData.tax_code || null,
          preparation_time: parseInt(formData.preparation_time) || 0,
          cleanup_time: parseInt(formData.cleanup_time) || 0
        };
        const newService = await createServiceType(serviceData as any);

        // Assign team members to newly created service
        if (newService && calendarIdToUse && selectedTeamMembers.length > 0) {
          await assignMultipleMembers(newService.id, selectedTeamMembers, calendarIdToUse);
        }
        toast({
          title: t('settings.services.serviceCreatedToastTitle', 'Service created'),
          description: t('settings.services.serviceCreatedToastDesc', 'Service type has been created successfully')
        });
      }
      await refetch();
      handleClose();
    } catch (error) {
      console.error('Error saving service type:', error);
      toast({
        title: t('settings.services.errorToastTitle', 'Error'),
        description: t('settings.services.failedToSaveError', 'Failed to save service type. Please try again.'),
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
  const handleDelete = async (service: ServiceType) => {
    setDeletingService(service);
    setFutureBookingCount(null);
    setShowDeleteDialog(true);
    // Best-effort future-booking probe. If it fails we still allow the guarded delete
    // (soft-delete never orphans), we just fall back to the generic confirm copy.
    try {
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('service_type_id', service.id)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled')
        .neq('status', 'no-show');
      if (!error) setFutureBookingCount(count ?? 0);
    } catch (e) {
      console.error('Could not count future bookings for service:', e);
    }
  };
  const confirmDelete = async () => {
    if (!deletingService?.id) return;
    try {
      await deleteServiceType(deletingService.id);
      toast({
        title: t('settings.services.serviceDeletedToastTitle', 'Service deleted'),
        description: t('settings.services.serviceDeletedToastDesc', 'Service type has been deleted successfully')
      });
      await refetch();
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: t('settings.services.errorToastTitle', 'Error'),
        description: t('settings.services.failedToDeleteError', 'Failed to delete service type. Please try again.'),
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setDeletingService(null);
      setFutureBookingCount(null);
    }
  };
  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingService(null);
    setFutureBookingCount(null);
  };
  if (loading) {
    return <ServiceTypesLoadingState />;
  }
  return <div className="space-y-6">
      <SettingsSection
        icon={Tag}
        title={t('settings.services.sectionTitle', 'Services')}
        description={t('settings.services.sectionDescription', 'The services customers can book — duration, price and who performs them.')}
        usedByAgent
        action={
          serviceTypes.length > 0 ? (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('settings.services.addServiceButton', 'Add service')}
            </Button>
          ) : undefined
        }
        flush={serviceTypes.length === 0}
      >
        {serviceTypes.length === 0 ? (
          <ServiceTypesEmptyState onAddService={handleCreate} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {serviceTypes.map(service => (
              <ServiceTypeCard
                key={service.id}
                service={service}
                onEdit={() => handleEdit(service)}
                onDelete={() => handleDelete(service)}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.10] text-accent-foreground">
                <Tag className="h-[18px] w-[18px]" />
              </span>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-[-0.015em]">
                  {editingService ? t('settings.services.editServiceDialogTitle', 'Edit service') : t('settings.services.createServiceDialogTitle', 'Add a service')}
                </DialogTitle>
                <DialogDescription>
                  {editingService
                    ? t('settings.services.editServiceDialogDescription', 'Update the details, price and who can perform this service.')
                    : t('settings.services.createServiceDialogDescription', 'Set the details, price and who can perform this service.')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ServiceTypeForm formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={handleClose} saving={saving} isEditing={!!editingService} taxConfigured={hasCompleteTaxConfig} calendarId={targetCalendarId || selectedCalendar?.id} selectedTeamMembers={selectedTeamMembers} onTeamMembersChange={setSelectedTeamMembers} calendars={calendars} selectedCalendarId={targetCalendarId} onCalendarSelect={setTargetCalendarId} onCalendarCreated={handleCalendarCreated} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.services.deleteConfirmTitle', 'Delete this service?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {futureBookingCount && futureBookingCount > 0
                ? t('settings.services.deleteConfirmWithBookings', '"{{serviceName}}" has {{count}} upcoming booking(s). Deleting it removes the service from your booking flow and the AI agent, but those existing appointments keep their details. New customers can no longer book it. This can\'t be undone.', { serviceName: deletingService?.name, count: futureBookingCount })
                : t('settings.services.deleteConfirmDescription', 'Are you sure you want to delete "{{serviceName}}"? This can\'t be undone.', { serviceName: deletingService?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>{t('settings.services.deleteDialogCancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {t('settings.services.deleteDialogConfirm', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}