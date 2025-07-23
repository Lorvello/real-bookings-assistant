
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
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface ServiceTypeQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceTypeCreated: (serviceType: any) => void;
}

export function ServiceTypeQuickCreateDialog({ 
  open, 
  onOpenChange, 
  onServiceTypeCreated 
}: ServiceTypeQuickCreateDialogProps) {
  const { selectedCalendar } = useCalendarContext();
  const { createServiceType } = useServiceTypes();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '30',
    price: '',
    color: '#10B981'
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Service naam is verplicht",
        variant: "destructive",
      });
      return;
    }

    const duration = parseInt(formData.duration) || 0;
    if (duration <= 0) {
      toast({
        title: "Error", 
        description: "Duur moet groter zijn dan 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        duration: duration,
        price: formData.price === '' ? 0 : parseFloat(formData.price),
        color: formData.color,
        max_attendees: 1,
        preparation_time: 0,
        cleanup_time: 0,
        calendar_id: selectedCalendar?.id,
        is_active: true,
      };

      const newServiceType = await createServiceType(serviceData);
      
      if (newServiceType) {
        onServiceTypeCreated(newServiceType);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          duration: '30',
          price: '',
          color: '#10B981'
        });
        
        onOpenChange(false);
        
        toast({
          title: "Success", 
          description: "Service type succesvol aangemaakt",
        });
      }
    } catch (error) {
      console.error('Error saving service type:', error);
      toast({
        title: "Error",
        description: "Kon service type niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Service Type</DialogTitle>
          <DialogDescription>
            Quickly create a new service type for your calendar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="service-name">Service Name *</Label>
            <Input
              id="service-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Consultation"
            />
          </div>
          
          <div>
            <Label htmlFor="service-duration">Duration (minutes) *</Label>
            <Input
              id="service-duration"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              min="1"
              placeholder="30"
            />
          </div>
          
          <div>
            <Label htmlFor="service-price">Price (€)</Label>
            <Input
              id="service-price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <Label htmlFor="service-description">Description</Label>
            <Textarea
              id="service-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
            {saving ? 'Creating...' : 'Create Service Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
