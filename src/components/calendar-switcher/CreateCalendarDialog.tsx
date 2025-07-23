
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, User, Settings } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useCreateCalendar } from '@/hooks/useCreateCalendar';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { ServiceTypeQuickCreateDialog } from './ServiceTypeQuickCreateDialog';

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
  const { serviceTypes, loading: serviceTypesLoading } = useServiceTypes();
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    location: ''
  });

  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'editor' | 'viewer'>('viewer');
  const [showServiceTypeDialog, setShowServiceTypeDialog] = useState(false);

  const { createCalendar, loading: creating } = useCreateCalendar(onCalendarCreated);

  // Initialize with current user as owner when dialog opens
  useEffect(() => {
    if (open && profile && teamMembers.length === 0) {
      const ownerMember: TeamMember = {
        email: profile.email || '',
        name: profile.full_name || 'Current User',
        role: 'owner'
      };
      setTeamMembers([ownerMember]);
    }
  }, [open, profile]);

  const generateCalendarName = () => {
    const userName = profile?.full_name?.split(' ')[0] || 'My';
    return `${userName} Calendar`;
  };

  const addTeamMember = () => {
    if (!newMemberEmail.trim() || !newMemberName.trim()) return;
    
    // Check if email already exists
    if (teamMembers.some(member => member.email === newMemberEmail.trim())) {
      return; // Could show error toast here
    }
    
    const member: TeamMember = {
      email: newMemberEmail.trim(),
      name: newMemberName.trim(),
      role: newMemberRole
    };
    
    setTeamMembers([...teamMembers, member]);
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRole('viewer');
  };

  const removeTeamMember = (index: number) => {
    // Don't allow removing the owner (first member)
    if (index === 0) return;
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleServiceTypeSelect = (value: string) => {
    if (value === 'create_new') {
      setShowServiceTypeDialog(true);
      return;
    }
    
    if (!selectedServiceTypes.includes(value)) {
      setSelectedServiceTypes([...selectedServiceTypes, value]);
    }
  };

  const removeServiceType = (serviceTypeId: string) => {
    setSelectedServiceTypes(selectedServiceTypes.filter(id => id !== serviceTypeId));
  };

  const handleCreateCalendar = async () => {
    if (!newCalendar.name.trim()) return;
    if (selectedServiceTypes.length === 0) return;
    if (teamMembers.length === 0) return;

    try {
      await createCalendar({
        name: newCalendar.name,
        description: newCalendar.description,
        color: newCalendar.color,
        location: newCalendar.location,
        serviceTypes: selectedServiceTypes,
        teamMembers: teamMembers
      });
      
      // Reset form
      setNewCalendar({ 
        name: '', 
        description: '', 
        color: '#3B82F6',
        location: ''
      });
      setSelectedServiceTypes([]);
      setTeamMembers([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  const getServiceTypeName = (id: string) => {
    return serviceTypes.find(st => st.id === id)?.name || 'Unknown Service';
  };

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
              
              <div>
                <Label htmlFor="calendar-description">Description</Label>
                <Textarea
                  id="calendar-description"
                  placeholder="For which team member, location, or service is this calendar?"
                  value={newCalendar.description}
                  onChange={(e) => setNewCalendar(prev => ({ ...prev, description: e.target.value }))}
                />
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
                <Select onValueChange={handleServiceTypeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service types..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypesLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : (
                      <>
                        {serviceTypes.map((serviceType) => (
                          <SelectItem 
                            key={serviceType.id} 
                            value={serviceType.id}
                            disabled={selectedServiceTypes.includes(serviceType.id)}
                          >
                            {serviceType.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="create_new">
                          <div className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Create New Service Type</span>
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                {selectedServiceTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedServiceTypes.map((serviceTypeId) => (
                      <Badge key={serviceTypeId} variant="secondary" className="flex items-center space-x-1">
                        <span>{getServiceTypeName(serviceTypeId)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeServiceType(serviceTypeId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <Input
                    placeholder="Name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="md:col-span-2"
                  />
                  <Input
                    placeholder="email@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                    className="md:col-span-2"
                  />
                  <div className="flex space-x-1">
                    <Select value={newMemberRole} onValueChange={(value: 'editor' | 'viewer') => setNewMemberRole(value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addTeamMember}
                      disabled={!newMemberEmail.trim() || !newMemberName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/20">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className="text-sm text-muted-foreground">({member.email})</span>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                        {member.role !== 'owner' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeamMember(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Team members will receive an invitation to access this calendar
                </p>
              </div>
            </div>

            {/* Color */}
            <div>
              <Label htmlFor="calendar-color">Color</Label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="color"
                  id="calendar-color"
                  value={newCalendar.color}
                  onChange={(e) => setNewCalendar(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded border"
                />
                <span className="text-sm text-muted-foreground">{newCalendar.color}</span>
                <span className="text-xs text-muted-foreground">Choose a color to distinguish the calendar</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCalendar}
              disabled={
                !newCalendar.name.trim() || 
                selectedServiceTypes.length === 0 || 
                teamMembers.length === 0 || 
                creating
              }
            >
              {creating ? 'Creating...' : 'Create calendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showServiceTypeDialog && (
        <ServiceTypeQuickCreateDialog
          onServiceCreated={(serviceId) => {
            setSelectedServiceTypes([...selectedServiceTypes, serviceId]);
            setShowServiceTypeDialog(false);
          }}
          trigger={null}
        />
      )}
    </>
  );
}
