
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { Plus } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

interface ServiceTypeQuickCreateDialogProps {
  calendarId?: string;
  onServiceCreated?: (serviceId: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
}

export function ServiceTypeQuickCreateDialog({ 
  calendarId,
  onServiceCreated,
  trigger,
  open 
}: ServiceTypeQuickCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const [formData, setFormData] = useState({
    name: '',
    duration: '60',
    price: '',
    color: '#3B82F6',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { selectedCalendar } = useCalendarContext();
  const { createServiceType } = useServiceTypes(selectedCalendar?.id);
  const { user } = useAuth();

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;
    
    // Require calendar ID for service creation - don't allow null
    const targetCalendarId = calendarId || selectedCalendar?.id;
    
    if (!targetCalendarId) {
      console.error("Cannot create service type without a calendar");
      return;
    }
    
    if (!user) {
      console.error("User not authenticated");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newService = await createServiceType({
        name: formData.name,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : undefined,
        color: formData.color,
        description: formData.description,
        calendar_id: targetCalendarId, // Fix: Don't pass null calendar_id, it causes foreign key errors
        is_active: true,
        max_attendees: 1,
        preparation_time: 0,
        cleanup_time: 0,
        created_at: new Date().toISOString()
      });
      
      if (onServiceCreated && newService) {
        onServiceCreated(newService.id);
      }
      
      setFormData({
        name: '',
        duration: '60',
        price: '',
        color: '#3B82F6',
        description: ''
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-open dialog when open prop changes
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateService} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceName" className="block text-sm font-medium text-foreground mb-1">
                Service Name *
              </Label>
              <Input
                id="serviceName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Haircut"
                className="w-full"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="serviceDuration" className="block text-sm font-medium text-foreground mb-1">
                Duration (minutes) *
              </Label>
              <Input
                id="serviceDuration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="servicePrice" className="block text-sm font-medium text-foreground mb-1">
                Price (€)
              </Label>
              <Input
                id="servicePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="w-full"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-foreground mb-1">
                Color
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-foreground scale-110' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="serviceDescription" className="block text-sm font-medium text-foreground mb-1">
                Description
              </Label>
              <Textarea
                id="serviceDescription"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of the service"
                rows={3}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
