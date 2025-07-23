import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useDeleteCalendar } from '@/hooks/useDeleteCalendar';
import { useCalendarActions } from '@/hooks/calendar-settings/useCalendarActions';
import { fetchCalendarServiceTypes, fetchCalendarMembers } from '@/hooks/calendar-settings/calendarSettingsUtils';
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
        
        // Load currently linked service types
        try {
          const linkedServiceTypes = await fetchCalendarServiceTypes(calendar.id);
          setSelectedServiceTypes(linkedServiceTypes);
        } catch (error) {
          console.error('Error loading calendar service types:', error);
          setSelectedServiceTypes([]);
        }
        
        // Load currently linked team members
        try {
          const linkedMembers = await fetchCalendarMembers(calendar.id);
          setSelectedTeamMembers(linkedMembers);
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
      const success = await updateFullCalendar(calendar.id, {
        name: editCalendar.name,
        description: editCalendar.description,
        color: editCalendar.color,
        serviceTypeIds: selectedServiceTypes,
        memberUserIds: selectedTeamMembers
      });
      
      if (success) {
        onCalendarUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating calendar:', error);
      toast({
        title: "Error updating calendar",
        description: "Could not update calendar. Please try again.",
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
        title: "Calendar deleted",
        description: "Calendar has been deleted successfully",
      });
      
      onCalendarUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast({
        title: "Error deleting calendar",
        description: "Could not delete calendar. Please try again.",
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
    return serviceType?.name || serviceTypeId;
  };

  const getServiceTypeOptions = () => {
    return serviceTypes.map(serviceType => ({
      value: serviceType.id,
      label: serviceType.name,
    }));
  };

  const getTeamMemberOptions = () => {
    const uniqueMembers = getUniqueMembers();
    return uniqueMembers.map(member => ({
      value: member.id,
      label: member.user?.full_name || member.user?.email || member.id,
    }));
  };

  const handleServiceTypeChange = (selectedValues: string[]) => {
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
          <DialogTitle>Edit calendar</DialogTitle>
          <DialogDescription>
            Update your calendar settings and manage team members and service types.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Calendar Name */}
          <div>
            <Label htmlFor="calendar-name">Calendar name *</Label>
            <Input
              id="calendar-name"
              placeholder="mathew Calendar"
              value={editCalendar.name}
              onChange={(e) => setEditCalendar(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground mt-1">
              E.g: mathew Calendar, "John Smith", "Treatment Room 2"
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="calendar-description">Description</Label>
            <Textarea
              id="calendar-description"
              placeholder="For which team member, location, or service is this calendar?"
              value={editCalendar.description}
              onChange={(e) => setEditCalendar(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>


          {/* Service Types */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <h4 className="font-medium text-foreground">Service Types *</h4>
            </div>
            
            <SimpleMultiSelect
              options={getServiceTypeOptions()}
              selected={selectedServiceTypes}
              onChange={handleServiceTypeChange}
              placeholder="Select service types..."
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
              Create New Service Type
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Select the service types this calendar will offer
            </p>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <h4 className="font-medium text-foreground">Team Members *</h4>
            </div>
            
            <SimpleMultiSelect
              options={getTeamMemberOptions()}
              selected={selectedTeamMembers}
              onChange={handleTeamMemberChange}
              placeholder="Select team members..."
            />
            
            <p className="text-sm text-muted-foreground">
              Select team members who will have access to this calendar. Multiple members can be selected.
            </p>
          </div>

          {/* Color */}
          <div>
            <Label>Color</Label>
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
              Choose a color to distinguish the calendar
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Calendar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the calendar and all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCalendar} disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete Calendar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCalendar}
              disabled={!editCalendar.name.trim() || loading}
            >
              {loading ? 'Updating...' : 'Update calendar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {showServiceTypeDialog && (
        <ServiceTypeQuickCreateDialog
          open={showServiceTypeDialog}
          onServiceCreated={async (serviceId) => {
            setSelectedServiceTypes([...selectedServiceTypes, serviceId]);
            await refetchServiceTypes();
            setShowServiceTypeDialog(false);
          }}
          trigger={null}
        />
      )}
    </Dialog>
  );
}