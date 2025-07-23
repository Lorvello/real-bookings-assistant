
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { Plus } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface ServiceTypeQuickCreateDialogProps {
  calendarId?: string;
  onServiceCreated?: (serviceId: string) => void;
  trigger?: React.ReactNode;
}

export function ServiceTypeQuickCreateDialog({ 
  calendarId,
  onServiceCreated,
  trigger 
}: ServiceTypeQuickCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { selectedCalendar } = useCalendarContext();
  const { createServiceType } = useServiceTypes(selectedCalendar?.id);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceName.trim()) return;
    
    const targetCalendarId = calendarId || selectedCalendar?.id;
    
    if (!targetCalendarId) {
      console.error("No calendar selected");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const newService = await createServiceType({
        name: serviceName,
        duration: parseInt(serviceDuration),
        color: '#3B82F6',
        calendar_id: targetCalendarId
      });
      
      if (onServiceCreated && newService) {
        onServiceCreated(newService.id);
      }
      
      setServiceName('');
      setServiceDuration('60');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateService} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="serviceName" className="text-gray-300">Service Name</Label>
            <Input
              id="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Haircut"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="serviceDuration" className="text-gray-300">Duration (minutes)</Label>
            <Input
              id="serviceDuration"
              type="number"
              min="5"
              step="5"
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="mr-2 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !serviceName.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
