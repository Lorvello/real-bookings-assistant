
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('notifications');

  const validateForm = (): boolean => {
    if (!date) {
      toast({
        title: t('addOverrideModal.dateRequiredTitle', 'Date required'),
        description: t('addOverrideModal.dateRequiredDescription', 'Please select a date for the override.'),
        variant: "destructive",
      });
      return false;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: t('addOverrideModal.invalidDateTitle', 'Invalid date'),
        description: t('addOverrideModal.invalidDateDescription', 'Date cannot be in the past.'),
        variant: "destructive",
      });
      return false;
    }

    if (type === 'closed' && !reason.trim()) {
      toast({
        title: t('addOverrideModal.reasonRequiredTitle', 'Reason required'),
        description: t('addOverrideModal.reasonRequiredDescription', "Please provide a reason why you're unavailable."),
        variant: "destructive",
      });
      return false;
    }

    if (type === 'custom' && startTime >= endTime) {
      toast({
        title: t('addOverrideModal.invalidTimesTitle', 'Invalid times'),
        description: t('addOverrideModal.invalidTimesDescription', 'End time must be after start time.'),
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
        title: t('addOverrideModal.overrideAddedTitle', 'Override added'),
        description: t('addOverrideModal.overrideAddedDescription', '{{overrideType}} for {{date}} saved.', {
          overrideType: type === 'closed'
            ? t('addOverrideModal.overrideTypeClosed', 'Closed day')
            : t('addOverrideModal.overrideTypeCustom', 'Custom times'),
          date: new Date(date).toLocaleDateString('en-US'),
        }),
      });

      onClose();
    } catch (error) {
      console.error('Error creating override:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickReasons = [
    { label: `🏖️ ${t('addOverrideModal.quickReasonVacation', 'Vacation')}`, value: 'Vacation' },
    { label: `🤒 ${t('addOverrideModal.quickReasonSick', 'Sick')}`, value: 'Sick' },
    { label: `🎉 ${t('addOverrideModal.quickReasonDayOff', 'Day off')}`, value: 'Day off' },
    { label: `🎊 ${t('addOverrideModal.quickReasonHoliday', 'Holiday')}`, value: 'Holiday' },
    { label: `🏢 ${t('addOverrideModal.quickReasonMeeting', 'Meeting')}`, value: 'Meeting' },
    { label: `🔧 ${t('addOverrideModal.quickReasonMaintenance', 'Maintenance')}`, value: 'Maintenance' },
  ];

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('addOverrideModal.heading', 'Add Override')}
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
            <Label htmlFor="date">{t('addOverrideModal.dateLabel', 'Date')}</Label>
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
            <Label>{t('addOverrideModal.overrideTypeLabel', 'Override type')}</Label>
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
                🚫 {t('addOverrideModal.closedButton', 'Closed')}
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
                {t('addOverrideModal.customTimesButton', 'Custom times')}
              </button>
            </div>
          </div>

          {/* Closed Day - Reason */}
          {type === 'closed' && (
            <div className="space-y-2">
              <Label htmlFor="reason">{t('addOverrideModal.reasonLabel', 'Reason')}</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('addOverrideModal.reasonPlaceholder', 'E.g. Vacation, sick, day off...')}
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
                <Label htmlFor="startTime">{t('addOverrideModal.fromLabel', 'From')}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t('addOverrideModal.toLabel', 'To')}</Label>
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
              {t('addOverrideModal.cancelButton', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? t('addOverrideModal.savingButton', 'Saving...') : t('addOverrideModal.saveButton', 'Save')}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
