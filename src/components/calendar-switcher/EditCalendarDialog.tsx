
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
import { X, Plus, User } from 'lucide-react';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useCalendarSettings } from '@/hooks/useCalendarSettings';
import { useToast } from '@/hooks/use-toast';
import type { Calendar } from '@/types/database';

interface TeamMember {
  id?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  name?: string;
}

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
  const [calendarData, setCalendarData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    businessName: '',
    location: '',
    specialization: ''
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'editor' | 'viewer'>('viewer');
  const [loading, setLoading] = useState(false);

  const { 
    members, 
    inviteMember, 
    removeMember, 
    updateMemberRole 
  } = useCalendarMembers(calendar?.id || '');

  const { updateCalendarName } = useCalendarSettings(calendar?.id);

  // Load calendar data when dialog opens
  useEffect(() => {
    if (calendar && open) {
      setCalendarData({
        name: calendar.name || '',
        description: calendar.description || '',
        color: calendar.color || '#3B82F6',
        businessName: '', // These would come from extended calendar data
        location: '',
        specialization: ''
      });
    }
  }, [calendar, open]);

  // Convert members to team members format
  useEffect(() => {
    if (members) {
      const convertedMembers: TeamMember[] = members.map(member => ({
        id: member.id,
        email: member.user?.email || '',
        role: member.role,
        name: member.user?.full_name
      }));
      setTeamMembers(convertedMembers);
    }
  }, [members]);

  const addTeamMember = async () => {
    if (!newMemberEmail.trim() || !calendar?.id) return;
    
    try {
      await inviteMember(newMemberEmail.trim(), newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('viewer');
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  const removeTeamMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleUpdateCalendar = async () => {
    if (!calendarData.name.trim() || !calendar?.id) return;

    setLoading(true);
    try {
      // Update calendar name
      await updateCalendarName(calendarData.name);
      
      toast({
        title: "Calendar updated",
        description: "Calendar has been updated successfully",
      });
      
      onCalendarUpdated?.();
      onOpenChange(false);
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

  if (!calendar) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit calendar</DialogTitle>
          <DialogDescription>
            Update your calendar settings and manage team members.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="calendar-name">Calendar name *</Label>
              <Input
                id="calendar-name"
                placeholder="Calendar name"
                value={calendarData.name}
                onChange={(e) => setCalendarData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="calendar-description">Description</Label>
              <Textarea
                id="calendar-description"
                placeholder="Calendar description"
                value={calendarData.description}
                onChange={(e) => setCalendarData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Additional Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  placeholder="Your business name"
                  value={calendarData.businessName}
                  onChange={(e) => setCalendarData(prev => ({ ...prev, businessName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Office, Room 1, etc."
                  value={calendarData.location}
                  onChange={(e) => setCalendarData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                placeholder="What services does this calendar focus on?"
                value={calendarData.specialization}
                onChange={(e) => setCalendarData(prev => ({ ...prev, specialization: e.target.value }))}
              />
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <h4 className="font-medium text-foreground">Team Members</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  placeholder="team@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                  className="flex-1"
                />
                <Select value={newMemberRole} onValueChange={(value: 'editor' | 'viewer') => setNewMemberRole(value)}>
                  <SelectTrigger className="w-32">
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
                  disabled={!newMemberEmail.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  {teamMembers.map((member, index) => (
                    <div key={member.id || index} className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/20">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{member.name || member.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                      {member.role !== 'owner' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => member.id && removeTeamMember(member.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color */}
          <div>
            <Label htmlFor="calendar-color">Color</Label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="color"
                id="calendar-color"
                value={calendarData.color}
                onChange={(e) => setCalendarData(prev => ({ ...prev, color: e.target.value }))}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm text-muted-foreground">{calendarData.color}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateCalendar}
            disabled={!calendarData.name.trim() || loading}
          >
            {loading ? 'Updating...' : 'Update calendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
