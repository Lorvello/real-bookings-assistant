
import React, { useState } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { useCreateCalendar } from '@/hooks/useCreateCalendar';

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'dropdown' | 'button';
}

export function CreateCalendarDialog({ 
  open, 
  onOpenChange, 
  trigger = 'dropdown' 
}: CreateCalendarDialogProps) {
  const { profile } = useProfile();
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const { createCalendar, loading: creating } = useCreateCalendar();

  // Generate a better default calendar name
  const generateCalendarName = () => {
    const userName = profile?.full_name?.split(' ')[0] || 'My';
    const businessName = profile?.business_name;
    
    if (businessName) {
      return `${businessName} Calendar`;
    }
    return `${userName} Calendar`;
  };

  const handleCreateCalendar = async () => {
    if (!newCalendar.name.trim()) return;

    try {
      await createCalendar({
        name: newCalendar.name,
        description: newCalendar.description,
        color: newCalendar.color
      });
      
      setNewCalendar({ name: '', description: '', color: '#3B82F6' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new calendar</DialogTitle>
          <DialogDescription>
            Create a new calendar for yourself or a team member. You can always adjust the settings later.
          </DialogDescription>
        </DialogHeader>
        
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
            <Label htmlFor="calendar-description">Description (optional)</Label>
            <Textarea
              id="calendar-description"
              placeholder="For which team member or location is this calendar?"
              value={newCalendar.description}
              onChange={(e) => setNewCalendar(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
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
            disabled={!newCalendar.name.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create calendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
