import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Settings, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useDeleteCalendar } from '@/hooks/useDeleteCalendar';
import { useCalendarActions } from '@/hooks/calendar-settings/useCalendarActions';
import { fetchServiceTypesByCalendarId, fetchCalendarMembers } from '@/hooks/calendar-settings/calendarSettingsUtils';
import { SimpleMultiSelect } from '@/components/ui/simple-multi-select';
import { ServiceTypeQuickCreateDialog } from './ServiceTypeQuickCreateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Calendar } from '@/types/database';

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

interface EditCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: Calendar | null;
  onCalendarUpdated?: () => void;
}

export function EditCalendarDialog({ 
  open, 
  onOpenChange, 
  calendar,
  onCalendarUpdated
}: EditCalendarDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation('appPages');
  const { serviceTypes, loading: serviceTypesLoading, refetch: refetchServiceTypes } = useServiceTypes(undefined, true);
  const { members: availableMembers, loading: membersLoading } = useCalendarMembers();
  const { updateCalendarName } = useCalendarSettings(calendar?.id);
  const { deleteCalendar } = useDeleteCalendar();
  const { updateFullCalendar } = useCalendarActions();

  const [editCalendar, setEditCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  // IUX R55 (EDITCALENDAR-SERVICETYPES-DUALTABLE): snapshot of what was ALREADY linked to this
  // calendar when the dialog opened. Services in this set cannot be deselected here: RLS
  // (service_types_owner_only_modify's WITH CHECK) structurally rejects any write that would set
  // service_types.calendar_id to null, since that can never satisfy "a calendar this user owns has
  // this id." Every other real editing surface (Settings > Services) already models a service's
  // calendar as reassignable-but-never-unassignable for the same reason. See handleServiceTypeChange.
  const [initiallyLinkedServiceTypes, setInitiallyLinkedServiceTypes] = useState<string[]>([]);
  // The service types linked to THIS calendar, with names. useServiceTypes(undefined, true) only
  // returns the ACTIVE calendars' services, so when editing a non-active calendar its linked services
  // were missing from the options and SimpleMultiSelect fell back to showing the raw UUID. We merge
  // these in so every selected service type always resolves to its name.
  const [linkedServiceTypeOptions, setLinkedServiceTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showServiceTypeDialog, setShowServiceTypeDialog] = useState(false);

  // Load calendar data when dialog opens
  useEffect(() => {
    const loadCalendarData = async () => {
      if (calendar && open) {
        setEditCalendar({
          name: calendar.name || '',
          description: calendar.description || '',
          color: calendar.color || '#3B82F6',
        });
        
        // Load currently linked service types (+ their names, so the multiselect never shows a UUID).
        // IUX R55 (EDITCALENDAR-SERVICETYPES-DUALTABLE): read via service_types.calendar_id
        // directly, the same source of truth useServiceTypes.tsx and useCreateCalendar.tsx use,
        // instead of the calendar_service_types junction table (which the bundled "New Calendar"
        // service-creation flow never wrote to, causing this dialog to show "0 services selected"
        // for every calendar created the normal way).
        try {
          const linkedServiceTypes = await fetchServiceTypesByCalendarId(calendar.id);
          setSelectedServiceTypes(linkedServiceTypes);
          setInitiallyLinkedServiceTypes(linkedServiceTypes);
          if (linkedServiceTypes.length) {
            const { data: stRows } = await supabase
              .from('service_types').select('id, name').in('id', linkedServiceTypes);
            setLinkedServiceTypeOptions(((stRows as { id: string; name: string }[]) ?? []).map(s => ({ value: s.id, label: s.name })));
          } else {
            setLinkedServiceTypeOptions([]);
          }
        } catch (error) {
          console.error('Error loading calendar service types:', error);
          setSelectedServiceTypes([]);
          setInitiallyLinkedServiceTypes([]);
          setLinkedServiceTypeOptions([]);
        }
        
        // Load currently linked team members (calendar_member IDs)
        try {
          const linkedMemberIds = await fetchCalendarMembers(calendar.id);
          setSelectedTeamMembers(linkedMemberIds);
        } catch (error) {
          console.error('Error loading calendar members:', error);
          setSelectedTeamMembers([]);
        }
      }
    };

    loadCalendarData();
  }, [calendar, open]);

  const handleUpdateCalendar = async () => {
    if (!editCalendar.name.trim() || !calendar?.id) return;

    setLoading(true);
    try {
      // Convert selected calendar member IDs to user IDs
      const memberUserIds = selectedTeamMembers
        .map(memberId => availableMembers.find(member => member.id === memberId)?.user_id)
        .filter(Boolean) as string[];

      const success = await updateFullCalendar(calendar.id, {
        name: editCalendar.name,
        description: editCalendar.description,
        color: editCalendar.color,
        serviceTypeIds: selectedServiceTypes,
        memberUserIds: memberUserIds
      });
      
      if (success) {
        onCalendarUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating calendar:', error);
      toast({
        title: t('calPage.editCalendar.updateError.title', 'Error updating calendar'),
        description: t('calPage.editCalendar.updateError.description', 'Could not update calendar. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!calendar?.id) return;

    setLoading(true);
    try {
      await deleteCalendar(calendar.id);
      
      toast({
        title: t('calPage.editCalendar.deleteSuccess.title', 'Calendar deleted'),
        description: t('calPage.editCalendar.deleteSuccess.description', 'Calendar has been deleted successfully'),
      });
      
      onCalendarUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast({
        title: t('calPage.editCalendar.deleteError.title', 'Error deleting calendar'),
        description: t('calPage.editCalendar.deleteError.description', 'Could not delete calendar. Please try again.'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeServiceType = (serviceTypeId: string) => {
    setSelectedServiceTypes(prev => prev.filter(id => id !== serviceTypeId));
  };

  const removeTeamMember = (memberId: string) => {
    setSelectedTeamMembers(prev => prev.filter(id => id !== memberId));
  };

  const getTeamMemberName = (memberId: string) => {
    const member = availableMembers.find(m => m.id === memberId);
    return member?.user?.full_name || member?.user?.email || memberId;
  };

  // Deduplicate members by email to prevent showing same user multiple times
  const getUniqueMembers = () => {
    const seen = new Set();
    return availableMembers.filter(member => {
      const email = member.user?.email;
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  };

  const getAvailableTeamMembers = () => {
    const uniqueMembers = getUniqueMembers();
    return uniqueMembers.filter(member => !selectedTeamMembers.includes(member.id));
  };

  const getServiceTypeName = (serviceTypeId: string) => {
    const serviceType = serviceTypes.find(st => st.id === serviceTypeId);
    if (serviceType) return serviceType.name;
    const linked = linkedServiceTypeOptions.find(o => o.value === serviceTypeId);
    return linked?.label || serviceTypeId;
  };

  const getServiceTypeOptions = () => {
    // All addable services (active calendars) + this calendar's currently-linked ones (dedup by id),
    // so every selected service type resolves to its name instead of a raw UUID.
    const map = new Map<string, { value: string; label: string }>();
    serviceTypes.forEach(st => map.set(st.id, { value: st.id, label: st.name }));
    linkedServiceTypeOptions.forEach(opt => { if (!map.has(opt.value)) map.set(opt.value, opt); });
    return Array.from(map.values());
  };

  const getTeamMemberOptions = () => {
    const uniqueMembers = getUniqueMembers();
    return uniqueMembers.map(member => ({
      value: member.id,
      label: member.user?.full_name || member.user?.email || member.id,
    }));
  };

  const handleServiceTypeChange = (selectedValues: string[]) => {
    // IUX R55 (EDITCALENDAR-SERVICETYPES-DUALTABLE): a service already linked to this calendar
    // cannot be deselected here (see initiallyLinkedServiceTypes comment above, RLS-enforced). If
    // the multiselect tries to drop one, restore it and tell the owner where the real operation
    // (reassign to a different calendar, or delete the service) lives, instead of silently
    // accepting a selection that Save would not actually be able to honor.
    const droppedAlreadyLinked = initiallyLinkedServiceTypes.filter(id => !selectedValues.includes(id));
    if (droppedAlreadyLinked.length > 0) {
      setSelectedServiceTypes([...new Set([...selectedValues, ...droppedAlreadyLinked])]);
      toast({
        title: t('calPage.editCalendar.cannotRemoveServiceTitle', "Can't remove this service here"),
        description: t(
          'calPage.editCalendar.cannotRemoveServiceDescription',
          'A service already belongs to exactly one calendar. To move or remove it, use Settings > Services.'
        ),
        variant: "destructive",
      });
      return;
    }
    setSelectedServiceTypes(selectedValues);
  };

  const handleTeamMemberChange = (selectedValues: string[]) => {
    setSelectedTeamMembers(selectedValues);
  };

  if (!calendar) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('calPage.editCalendar.title', 'Edit calendar')}</DialogTitle>
          <DialogDescription>
            {t('calPage.editCalendar.description', 'Update your calendar settings and manage team members and service types.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Calendar Name */}
          <div>
            <Label htmlFor="calendar-name">{t('calPage.editCalendar.nameLabel', 'Calendar name *')}</Label>
            <Input
              id="calendar-name"
              placeholder={t('calPage.editCalendar.namePlaceholder', 'e.g. Main Calendar')}
              value={editCalendar.name}
              onChange={(e) => setEditCalendar(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t('calPage.editCalendar.nameHint', 'A clear name for this calendar, such as a person, location, or room.')}
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="calendar-description">{t('calPage.editCalendar.descriptionLabel', 'Description')}</Label>
            <Textarea
              id="calendar-description"
              placeholder={t('calPage.editCalendar.descriptionPlaceholder', 'For which team member, location, or service is this calendar?')}
              value={editCalendar.description}
              onChange={(e) => setEditCalendar(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>


          {/* Service Types */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <h4 className="font-medium text-foreground">{t('calPage.editCalendar.serviceTypesLabel', 'Service Types *')}</h4>
            </div>

            <SimpleMultiSelect
              options={getServiceTypeOptions()}
              selected={selectedServiceTypes}
              onChange={handleServiceTypeChange}
              placeholder={t('calPage.editCalendar.serviceTypesPlaceholder', 'Select service types...')}
            />

            {/* Create New Service Type Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowServiceTypeDialog(true)}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('calPage.editCalendar.createServiceButton', 'Create New Service Type')}
            </Button>

            <p className="text-sm text-muted-foreground">
              {t('calPage.editCalendar.serviceTypesHint', 'Select the service types this calendar will offer')}
            </p>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <h4 className="font-medium text-foreground">{t('calPage.editCalendar.membersLabel', 'Team Members *')}</h4>
            </div>

            <SimpleMultiSelect
              options={getTeamMemberOptions()}
              selected={selectedTeamMembers}
              onChange={handleTeamMemberChange}
              placeholder={t('calPage.editCalendar.membersPlaceholder', 'Select team members...')}
            />

            <p className="text-sm text-muted-foreground">
              {t('calPage.editCalendar.membersHint', 'Select team members who will have access to this calendar. Multiple members can be selected.')}
            </p>
          </div>

          {/* Color */}
          <div>
            <Label>{t('calPage.editCalendar.colorLabel', 'Color')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    editCalendar.color === color ? 'border-primary scale-110' : 'border-muted hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setEditCalendar(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('calPage.editCalendar.colorHint', 'Choose a color to distinguish the calendar')}
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('calPage.editCalendar.deleteButton', 'Delete Calendar')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('calPage.editCalendar.deleteConfirm.title', 'Are you sure?')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('calPage.editCalendar.deleteConfirm.description', 'This action cannot be undone. This will permanently delete the calendar and all its data.')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('calPage.editCalendar.deleteConfirm.cancel', 'Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCalendar} disabled={loading}>
                  {loading ? t('calPage.editCalendar.deletingButton', 'Deleting...') : t('calPage.editCalendar.deleteButton', 'Delete Calendar')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('calPage.editCalendar.cancelButton', 'Cancel')}
            </Button>
            <Button
              onClick={handleUpdateCalendar}
              disabled={!editCalendar.name.trim() || loading}
            >
              {loading ? t('calPage.editCalendar.submittingButton', 'Updating...') : t('calPage.editCalendar.submitButton', 'Update calendar')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {showServiceTypeDialog && (
        <ServiceTypeQuickCreateDialog
          calendarId={calendar?.id}
          open={showServiceTypeDialog}
          onServiceCreated={async (serviceIdOrPending) => {
            // In edit mode, calendar exists so we only get string IDs
            if (typeof serviceIdOrPending === 'string') {
              setSelectedServiceTypes([...selectedServiceTypes, serviceIdOrPending]);
              await refetchServiceTypes();
            }
            setShowServiceTypeDialog(false);
          }}
          trigger={null}
        />
      )}
    </Dialog>
  );
}