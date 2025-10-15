
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Clock, User, Mail, CalendarDays } from 'lucide-react';
import { usePublicWaitlist } from '@/hooks/usePublicWaitlist';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarSlug: string;
  serviceTypeId: string;
  serviceName: string;
  onSuccess?: () => void;
}

export function WaitlistDialog({ 
  open, 
  onOpenChange, 
  calendarSlug, 
  serviceTypeId, 
  serviceName,
  onSuccess 
}: WaitlistDialogProps) {
  const { joinWaitlist, loading } = usePublicWaitlist();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    preferred_time_start: '',
    preferred_time_end: '',
    flexibility: 'anytime'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !formData.customer_name) {
      return;
    }

    const result = await joinWaitlist(
      calendarSlug,
      serviceTypeId,
      formData.customer_name,
      formData.customer_email || '', // Allow empty email
      selectedDate,
      formData.preferred_time_start || undefined,
      formData.preferred_time_end || undefined,
      formData.flexibility
    );

    if (result.success) {
      onOpenChange(false);
      setFormData({
        customer_name: '',
        customer_email: '',
        preferred_time_start: '',
        preferred_time_end: '',
        flexibility: 'anytime'
      });
      setSelectedDate(undefined);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Waitlist for {serviceName}
          </DialogTitle>
          <DialogDescription>
            There are currently no available times. Add yourself to the waitlist and we'll let you know as soon as a spot opens up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_name">Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer_name"
                placeholder="Enter your name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_email">Email (optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="customer_email"
                type="email"
                placeholder="you@email.com"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email is useful for confirmations, but not required
            </p>
          </div>

          <div className="space-y-2">
            <Label>Preferred date *</Label>
            <div className="border rounded-md p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="w-full"
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-muted-foreground flex items-center">
                <CalendarDays className="h-4 w-4 mr-1" />
                {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: nl })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="flexibility">Flexibility</Label>
            <Select value={formData.flexibility} onValueChange={(value) => setFormData({ ...formData, flexibility: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Always available</SelectItem>
                <SelectItem value="morning">Morning only</SelectItem>
                <SelectItem value="afternoon">Afternoon only</SelectItem>
                <SelectItem value="specific">Specific time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.flexibility === 'specific' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">From time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.preferred_time_start}
                  onChange={(e) => setFormData({ ...formData, preferred_time_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">To time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.preferred_time_end}
                  onChange={(e) => setFormData({ ...formData, preferred_time_end: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedDate || !formData.customer_name}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add to waitlist'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
