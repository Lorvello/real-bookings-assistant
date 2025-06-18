import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Calendar,
  Clock,
  Copy,
  Trash2,
  Star
} from 'lucide-react';
import { AvailabilitySchedule } from '@/types/database';

interface ScheduleTemplatesProps {
  calendarId: string;
  schedules: AvailabilitySchedule[];
  onScheduleCreate: (name: string) => Promise<void>;
  selectedScheduleId: string;
}

const PRESET_TEMPLATES = [
  {
    name: 'Standaard Kantooruren',
    description: 'Maandag t/m vrijdag 9:00-17:00',
    icon: Clock,
    schedule: [
      { day: 1, start: '09:00', end: '17:00', available: true },
      { day: 2, start: '09:00', end: '17:00', available: true },
      { day: 3, start: '09:00', end: '17:00', available: true },
      { day: 4, start: '09:00', end: '17:00', available: true },
      { day: 5, start: '09:00', end: '17:00', available: true },
      { day: 6, start: '09:00', end: '17:00', available: false },
      { day: 0, start: '09:00', end: '17:00', available: false },
    ]
  },
  {
    name: 'Retail Schema',
    description: 'Maandag t/m zaterdag 10:00-20:00',
    icon: Calendar,
    schedule: [
      { day: 1, start: '10:00', end: '20:00', available: true },
      { day: 2, start: '10:00', end: '20:00', available: true },
      { day: 3, start: '10:00', end: '20:00', available: true },
      { day: 4, start: '10:00', end: '20:00', available: true },
      { day: 5, start: '10:00', end: '20:00', available: true },
      { day: 6, start: '10:00', end: '18:00', available: true },
      { day: 0, start: '12:00', end: '17:00', available: false },
    ]
  },
  {
    name: 'Flexibel Schema',
    description: 'Vroege ochtend en avonden',
    icon: Star,
    schedule: [
      { day: 1, start: '07:00', end: '10:00', available: true },
      { day: 2, start: '07:00', end: '10:00', available: true },
      { day: 3, start: '07:00', end: '10:00', available: true },
      { day: 4, start: '18:00', end: '21:00', available: true },
      { day: 5, start: '18:00', end: '21:00', available: true },
      { day: 6, start: '09:00', end: '15:00', available: true },
      { day: 0, start: '10:00', end: '14:00', available: true },
    ]
  }
];

export function ScheduleTemplates({
  schedules,
  onScheduleCreate,
  selectedScheduleId
}: ScheduleTemplatesProps) {
  const [newScheduleName, setNewScheduleName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) return;
    
    await onScheduleCreate(newScheduleName);
    setNewScheduleName('');
    setShowCreateDialog(false);
  };

  const handleApplyTemplate = async (template: typeof PRESET_TEMPLATES[0]) => {
    await onScheduleCreate(`${template.name} - ${new Date().toLocaleDateString()}`);
    // Note: In a real implementation, you'd also apply the schedule rules
  };

  return (
    <div className="space-y-6">
      {/* Existing Schedules */}
      <div className="bg-background-secondary rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Mijn Schema's</h3>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Schema
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nieuw Schema Maken</DialogTitle>
                <DialogDescription>
                  Geef je nieuwe beschikbaarheidsschema een naam
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schedule-name" className="text-muted-foreground">
                    Schema Naam
                  </Label>
                  <Input
                    id="schedule-name"
                    value={newScheduleName}
                    onChange={(e) => setNewScheduleName(e.target.value)}
                    placeholder="bijv. Zomer Schema, Weekend Schema"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleCreateSchedule}>
                    Schema Maken
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                schedule.id === selectedScheduleId
                  ? 'bg-primary/10 border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground truncate">
                    {schedule.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Gemaakt op {new Date(schedule.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  {schedule.is_default && (
                    <Badge variant="default" className="text-xs">
                      Standaard
                    </Badge>
                  )}
                  
                  <Button variant="ghost" size="sm" className="p-1">
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {!schedule.is_default && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Library */}
      <div className="bg-background-secondary rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-foreground mb-4">
          Template Bibliotheek
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_TEMPLATES.map((template, index) => {
            const IconComponent = template.icon;
            
            return (
              <div
                key={index}
                className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full border-border"
                >
                  Template Gebruiken
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
