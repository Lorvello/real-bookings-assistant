
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useTeamMemberServices } from '@/hooks/useTeamMemberServices';
import { TeamMemberSelector } from '@/components/service-types/TeamMemberSelector';
import { Plus } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

// Type for pending service that hasn't been saved to DB yet
export interface PendingServiceType {
  id: string;
  name: string;
  duration: number;
  price?: number;
  color: string;
  description?: string;
  isPending: true;
}

interface ServiceTypeQuickCreateDialogProps {
  calendarId?: string;
  onServiceCreated?: (serviceIdOrPending: string | PendingServiceType) => void;
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
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { selectedCalendar } = useCalendarContext();
  const { createServiceType } = useServiceTypes(selectedCalendar?.id);
  const { assignMultipleMembers } = useTeamMemberServices(calendarId || selectedCalendar?.id);
  const { user } = useAuth();

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;
    
    const targetCalendarId = calendarId || selectedCalendar?.id || null;
    
    if (!user) {
      console.error("User not authenticated");
      return;
    }
    
    // If no calendar exists yet, create a pending service type (store locally)
    if (!targetCalendarId) {
      const pendingService: PendingServiceType = {
        id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: formData.name,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : undefined,
        color: formData.color,
        description: formData.description || undefined,
        isPending: true
      };
      
      if (onServiceCreated) {
        onServiceCreated(pendingService);
      }
      
      // Reset form and close
      setFormData({
        name: '',
        duration: '60',
        price: '',
        color: '#3B82F6',
        description: ''
      });
      setSelectedTeamMembers([]);
      setIsOpen(false);
      return;
    }
    
    // Calendar exists - save to database as normal
    setIsSubmitting(true);
    
    try {
      const newService = await createServiceType({
        name: formData.name,
        duration: parseInt(formData.duration),
        price: formData.price ? parseFloat(formData.price) : undefined,
        color: formData.color,
        description: formData.description,
        calendar_id: targetCalendarId,
        is_active: true,
        max_attendees: 1,
        preparation_time: 0,
        cleanup_time: 0,
        created_at: new Date().toISOString()
      });
      
      // Assign team members if any selected and calendar exists
      if (newService && targetCalendarId && selectedTeamMembers.length > 0) {
        await assignMultipleMembers(newService.id, selectedTeamMembers, targetCalendarId);
      }
      
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
      setSelectedTeamMembers([]);
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

  const targetCalendarId = calendarId || selectedCalendar?.id || null;

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

          {/* Team Member Assignment - only show if calendar exists */}
          {targetCalendarId && (
            <>
              <Separator />
              <TeamMemberSelector
                calendarId={targetCalendarId}
                selectedMemberIds={selectedTeamMembers}
                onSelectionChange={setSelectedTeamMembers}
                disabled={isSubmitting}
              />
            </>
          )}
          
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
