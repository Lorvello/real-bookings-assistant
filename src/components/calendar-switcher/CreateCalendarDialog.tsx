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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleMultiSelect } from '@/components/ui/simple-multi-select';
import { X, Plus, User, Settings, Clock } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useCreateCalendar } from '@/hooks/useCreateCalendar';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { ServiceTypeQuickCreateDialog, PendingServiceType } from './ServiceTypeQuickCreateDialog';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CalendarUpgradeModal } from './CalendarUpgradeModal';
import { AvailabilityQuickSetup, getDefaultAvailability, DayAvailability } from './AvailabilityQuickSetup';

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

interface TeamMember {
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'dropdown' | 'button';
  onCalendarCreated?: () => void;
}

export function CreateCalendarDialog({ 
  open, 
  onOpenChange, 
  trigger = 'dropdown',
  onCalendarCreated
}: CreateCalendarDialogProps) {
  const { profile } = useProfile();
  const { serviceTypes, loading: serviceTypesLoading, refetch: refetchServiceTypes } = useServiceTypes(undefined, true);
  const { members: availableMembers, loading: membersLoading } = useCalendarMembers();
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    color: '#3B82F6',
    location: ''
  });

  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [pendingServiceTypes, setPendingServiceTypes] = useState<PendingServiceType[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [showServiceTypeDialog, setShowServiceTypeDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(getDefaultAvailability);

  const { checkAccess, userStatus } = useAccessControl();

  const { createCalendar, loading: creating, canCreateMore, currentCount, maxCalendars } = useCreateCalendar(onCalendarCreated);

  // Auto-select current user and handle single team member case
  useEffect(() => {
    if (open && profile) {
      const currentUserEmail = profile.email || '';
      
      const uniqueMembers = (availableMembers || []).reduce((acc, member) => {
        const email = member.user?.email;
        if (email && !acc.find(m => m.user?.email === email)) {
          acc.push(member);
        }
        return acc;
      }, [] as typeof availableMembers);

      if (uniqueMembers.length <= 1 || !uniqueMembers.some(m => m.user?.email === currentUserEmail)) {
        setSelectedTeamMembers([currentUserEmail]);
      } else if (uniqueMembers.length === 1) {
        setSelectedTeamMembers([uniqueMembers[0].user?.email || '']);
      } else {
        setSelectedTeamMembers([currentUserEmail]);
      }
    }
  }, [open, profile, availableMembers]);

  const generateCalendarName = () => {
    const userName = profile?.full_name?.split(' ')[0] || 'My';
    return `${userName} Calendar`;
  };

  const removeServiceType = (serviceTypeId: string) => {
    setSelectedServiceTypes(selectedServiceTypes.filter(id => id !== serviceTypeId));
  };

  const removePendingServiceType = (pendingId: string) => {
    setPendingServiceTypes(pendingServiceTypes.filter(p => p.id !== pendingId));
  };

  const removeTeamMember = (email: string) => {
    setSelectedTeamMembers(selectedTeamMembers.filter(m => m !== email));
  };

  const handleCreateCalendar = async () => {
    if (!newCalendar.name.trim()) return;
    // Allow creation if we have either existing or pending service types
    if (selectedServiceTypes.length === 0 && pendingServiceTypes.length === 0) return;
    if (selectedTeamMembers.length === 0) return;

    try {
      const teamMembersForCreation = selectedTeamMembers.map(email => {
        const member = (availableMembers || []).find(m => m.user?.email === email);
        const isCurrentUser = email === profile?.email;
        
        return {
          email: email,
          name: isCurrentUser ? (profile?.full_name || 'Current User') : (member?.user?.full_name || email.split('@')[0]),
          role: isCurrentUser ? 'owner' as const : 'viewer' as const
        };
      });

      await createCalendar({
        name: newCalendar.name,
        description: '',
        color: newCalendar.color,
        location: newCalendar.location,
        serviceTypes: selectedServiceTypes,
        pendingServiceTypes: pendingServiceTypes,
        teamMembers: teamMembersForCreation,
        availability: availability
      });
      
      // Reset form
      setNewCalendar({ 
        name: '', 
        color: '#3B82F6',
        location: ''
      });
      setSelectedServiceTypes([]);
      setPendingServiceTypes([]);
      setSelectedTeamMembers([]);
      setAvailability(getDefaultAvailability());
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const getTeamMemberName = (email: string) => {
    if (email === profile?.email) {
      return profile?.full_name || 'Current User';
    }
    const member = (availableMembers || []).find(m => m.user?.email === email);
    return member?.user?.full_name || email.split('@')[0];
  };

  const getAvailableTeamMembers = () => {
    const uniqueMembers = [];
    const seenEmails = new Set();
    
    if (profile?.email && !seenEmails.has(profile.email)) {
      uniqueMembers.push({
        email: profile.email,
        name: profile.full_name || 'Current User',
        role: 'owner'
      });
      seenEmails.add(profile.email);
    }
    
    (availableMembers || []).forEach(member => {
      const email = member.user?.email;
      if (email && !seenEmails.has(email)) {
        uniqueMembers.push({
          email: email,
          name: member.user?.full_name || email.split('@')[0],
          role: member.role
        });
        seenEmails.add(email);
      }
    });
    
    return uniqueMembers;
  };

  const getServiceTypeName = (id: string) => {
    return (serviceTypes || []).find(st => st.id === id)?.name || 'Unknown Service';
  };

  const getServiceTypeOptions = () => {
    if (!serviceTypes || !Array.isArray(serviceTypes)) {
      return [];
    }
    return serviceTypes.map(serviceType => ({
      value: serviceType.id,
      label: serviceType.name
    }));
  };

  const getTeamMemberOptions = () => {
    const availableMembers = getAvailableTeamMembers();
    if (!availableMembers || !Array.isArray(availableMembers)) {
      return [];
    }
    return availableMembers.map(member => ({
      value: member.email,
      label: `${member.name} - ${member.email}`
    }));
  };

  const handleServiceTypeChange = (selectedValues: string[]) => {
    setSelectedServiceTypes(selectedValues);
  };

  const handleTeamMemberChange = (selectedValues: string[]) => {
    setSelectedTeamMembers(selectedValues);
  };

  const handleServiceCreated = (serviceIdOrPending: string | PendingServiceType) => {
    if (typeof serviceIdOrPending === 'object' && serviceIdOrPending.isPending) {
      // Pending service - store locally
      setPendingServiceTypes(prev => [...prev, serviceIdOrPending]);
    } else if (typeof serviceIdOrPending === 'string') {
      // Existing service ID - add to selection
      setSelectedServiceTypes(prev => [...prev, serviceIdOrPending]);
      refetchServiceTypes();
    }
    setShowServiceTypeDialog(false);
  };

  const totalServiceCount = selectedServiceTypes.length + pendingServiceTypes.length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>      
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create new calendar</DialogTitle>
            <DialogDescription>
              Create a new calendar with team members and service types. All fields are required.
            </DialogDescription>
          </DialogHeader>
          
          {/* Subscription Access Check */}
          {!checkAccess('canCreateBookings') ? (
            <div className="space-y-4">
              <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
                <h4 className="font-medium text-destructive mb-2">Calendar Creation Restricted</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {userStatus.userType === 'expired_trial' 
                    ? 'Your trial has expired. Upgrade now to create new calendars and continue booking appointments.'
                    : 'Reactivate your account to create new calendars and access all booking features.'
                  }
                </p>
                <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                  {userStatus.userType === 'expired_trial' ? 'Upgrade Now' : 'Reactivate Subscription'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Calendar Limit Check */}
              {!canCreateMore && (
                <UpgradePrompt 
                  feature="Calendars"
                  currentUsage={`${currentCount}/${maxCalendars}`}
                  limit={`${maxCalendars} calendar${maxCalendars === 1 ? '' : 's'}`}
                  description="Upgrade to Professional to create unlimited calendars and access more features."
                  className="mb-6"
                />
              )}
          
              {canCreateMore && (
                <div className="text-sm text-muted-foreground mb-4">
                  Calendar usage: {currentCount}/{maxCalendars === null ? '∞' : maxCalendars}
                </div>
              )}
              
              <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="calendar-name">Calendar name *</Label>
                <Input
                  id="calendar-name"
                  placeholder={generateCalendarName()}
                  value={newCalendar.name}
                  onChange={(e) => setNewCalendar(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  E.g: {generateCalendarName()}, "John Smith", "Treatment Room 2"
                </p>
              </div>
              
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Additional Information</h4>
              
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Office, Room 1, etc."
                  value={newCalendar.location}
                  onChange={(e) => setNewCalendar(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>

            {/* Service Types */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <h4 className="font-medium text-foreground">Service Types *</h4>
              </div>
              
              <div className="space-y-3">
                <SimpleMultiSelect
                  options={getServiceTypeOptions()}
                  selected={selectedServiceTypes}
                  onChange={handleServiceTypeChange}
                  placeholder="Select service types..."
                  disabled={serviceTypesLoading}
                />
                
                {/* Show pending service types */}
                {pendingServiceTypes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">New services (will be created with calendar):</p>
                    <div className="flex flex-wrap gap-2">
                      {pendingServiceTypes.map((pending) => (
                        <Badge 
                          key={pending.id} 
                          variant="secondary"
                          className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                        >
                          <Clock className="h-3 w-3" />
                          {pending.name}
                          {pending.price && <span className="text-xs opacity-70">€{pending.price}</span>}
                          <button
                            type="button"
                            onClick={() => removePendingServiceType(pending.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowServiceTypeDialog(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Service Type</span>
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Select the service types this calendar will offer
                </p>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <h4 className="font-medium text-foreground">Team Members *</h4>
              </div>
              
              <div className="space-y-3">
                <SimpleMultiSelect
                  options={getTeamMemberOptions()}
                  selected={selectedTeamMembers}
                  onChange={handleTeamMemberChange}
                  placeholder="Select team members..."
                  disabled={membersLoading}
                />
                
                <p className="text-xs text-muted-foreground">
                  Select team members who will have access to this calendar. Multiple members can be selected.
                </p>
              </div>
            </div>

            {/* Working Hours */}
            <AvailabilityQuickSetup 
              availability={availability}
              onChange={setAvailability}
            />

            {/* Color */}
            <div>
              <Label htmlFor="calendar-color">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCalendar(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newCalendar.color === color ? 'border-foreground scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Choose a color to distinguish the calendar</p>
            </div>
          </div>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {checkAccess('canCreateBookings') && (
              <Button 
                onClick={handleCreateCalendar}
                disabled={
                  !canCreateMore ||
                  !newCalendar.name.trim() || 
                  totalServiceCount === 0 || 
                  selectedTeamMembers.length === 0 || 
                  creating
                }
              >
                {creating ? 'Creating...' : 'Create calendar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ServiceTypeQuickCreateDialog
        open={showServiceTypeDialog}
        onOpenChange={setShowServiceTypeDialog}
        onServiceCreated={handleServiceCreated}
        trigger={null}
      />

      <CalendarUpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
