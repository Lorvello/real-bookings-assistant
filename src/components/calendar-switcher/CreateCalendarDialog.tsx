
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useCreateCalendar } from '@/hooks/useCreateCalendar';

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCalendarDialog({ open, onOpenChange }: CreateCalendarDialogProps) {
  const { profile } = useProfile();
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const { createCalendar, loading: creating } = useCreateCalendar();

  // Generate a better default calendar name
  const generateCalendarName = () => {
    const userName = profile?.full_name?.split(' ')[0] || 'Mijn';
    const businessName = profile?.business_name;
    
    if (businessName) {
      return `${businessName} Kalender`;
    }
    return `${userName} Kalender`;
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
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe kalender
        </DropdownMenuItem>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe kalender aanmaken</DialogTitle>
          <DialogDescription>
            Maak een nieuwe kalender om je afspraken te organiseren.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="calendar-name">Kalendernaam</Label>
            <Input
              id="calendar-name"
              placeholder={generateCalendarName()}
              value={newCalendar.name}
              onChange={(e) => setNewCalendar(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Suggestie: {generateCalendarName()}
            </p>
          </div>
          
          <div>
            <Label htmlFor="calendar-description">Beschrijving (optioneel)</Label>
            <Textarea
              id="calendar-description"
              placeholder="Beschrijf waar deze kalender voor is..."
              value={newCalendar.description}
              onChange={(e) => setNewCalendar(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="calendar-color">Kleur</Label>
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="color"
                id="calendar-color"
                value={newCalendar.color}
                onChange={(e) => setNewCalendar(prev => ({ ...prev, color: e.target.value }))}
                className="w-8 h-8 rounded border"
              />
              <span className="text-sm text-muted-foreground">{newCalendar.color}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleCreateCalendar}
            disabled={!newCalendar.name.trim() || creating}
          >
            {creating ? 'Aanmaken...' : 'Kalender aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
