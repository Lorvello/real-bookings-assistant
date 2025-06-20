
import React, { useState } from 'react';
import { useAvailabilityOverrides } from '@/hooks/useAvailabilityOverrides';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Clock, X } from 'lucide-react';

interface AddOverrideModalProps {
  calendarId: string;
  onClose: () => void;
}

export function AddOverrideModal({ calendarId, onClose }: AddOverrideModalProps) {
  const [type, setType] = useState<'closed' | 'custom'>('closed');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createOverride } = useAvailabilityOverrides(calendarId);
  const { toast } = useToast();

  const validateForm = (): boolean => {
    if (!date) {
      toast({
        title: "Datum vereist",
        description: "Selecteer een datum voor de uitzondering.",
        variant: "destructive",
      });
      return false;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: "Ongeldige datum",
        description: "Datum kan niet in het verleden liggen.",
        variant: "destructive",
      });
      return false;
    }

    if (type === 'closed' && !reason.trim()) {
      toast({
        title: "Reden vereist",
        description: "Geef een reden op waarom je niet beschikbaar bent.",
        variant: "destructive",
      });
      return false;
    }

    if (type === 'custom' && startTime >= endTime) {
      toast({
        title: "Ongeldige tijden",
        description: "Eindtijd moet na starttijd zijn.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      await createOverride({
        date,
        is_available: type === 'custom',
        reason: type === 'closed' ? reason : null,
        start_time: type === 'custom' ? startTime : undefined,
        end_time: type === 'custom' ? endTime : undefined,
      });

      toast({
        title: "Uitzondering toegevoegd",
        description: `${type === 'closed' ? 'Gesloten dag' : 'Aangepaste tijden'} voor ${new Date(date).toLocaleDateString('nl-NL')} opgeslagen.`,
      });

      onClose();
    } catch (error) {
      console.error('Error creating override:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickReasons = [
    { label: '🏖️ Vakantie', value: 'Vakantie' },
    { label: '🤒 Ziek', value: 'Ziek' },
    { label: '🎉 Vrije dag', value: 'Vrije dag' },
    { label: '🎊 Feestdag', value: 'Feestdag' },
    { label: '🏢 Vergadering', value: 'Vergadering' },
    { label: '🔧 Onderhoud', value: 'Onderhoud' },
  ];

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Uitzondering toevoegen
            </AlertDialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-3">
            <Label>Type uitzondering</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('closed')}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  type === 'closed'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                🚫 Gesloten
              </button>
              <button
                type="button"
                onClick={() => setType('custom')}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  type === 'custom'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" />
                Aangepaste tijden
              </button>
            </div>
          </div>

          {/* Closed Day - Reason */}
          {type === 'closed' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reden</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bijv. Vakantie, ziek, vrije dag..."
                required
              />
              
              {/* Quick Reason Buttons */}
              <div className="flex flex-wrap gap-1">
                {quickReasons.map((quickReason) => (
                  <button
                    key={quickReason.value}
                    type="button"
                    onClick={() => setReason(quickReason.value)}
                    className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                  >
                    {quickReason.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Hours */}
          {type === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Van</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Tot</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
