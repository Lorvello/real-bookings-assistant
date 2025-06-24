
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookingForm } from '@/hooks/useBookingForm';
import { BookingBasicFields } from './booking/BookingBasicFields';
import { BookingDateTimeFields } from './booking/BookingDateTimeFields';
import { BookingReminderFields } from './booking/BookingReminderFields';
import { BookingFormActions } from './booking/BookingFormActions';

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  onBookingCreated?: () => void;
}

export function NewBookingModal({ open, onClose, calendarId, onBookingCreated }: NewBookingModalProps) {
  const handleBookingSuccess = () => {
    console.log('🎉 Booking created successfully, calling callbacks');
    onBookingCreated?.();
    onClose();
  };

  const {
    form,
    serviceTypes,
    autoUpdateEndTime,
    setAutoUpdateEndTime,
    hasReminder,
    startTime,
    endTime,
    isCreating,
    handleTimeChange,
    handleServiceTypeChange,
    getDuration,
    onSubmit,
  } = useBookingForm({ 
    calendarId, 
    onBookingCreated: handleBookingSuccess, 
    onClose 
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border h-[90vh] max-h-[700px] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle className="text-foreground">New Appointment</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
                <BookingBasicFields 
                  form={form} 
                  serviceTypes={serviceTypes} 
                  onServiceTypeChange={handleServiceTypeChange}
                />

                <BookingDateTimeFields 
                  form={form}
                  startTime={startTime}
                  endTime={endTime}
                  autoUpdateEndTime={autoUpdateEndTime}
                  onAutoUpdateChange={setAutoUpdateEndTime}
                  onTimeChange={handleTimeChange}
                  calculateDuration={getDuration}
                />

                <BookingReminderFields 
                  form={form} 
                  hasReminder={hasReminder} 
                />

                <BookingFormActions 
                  onClose={onClose} 
                  isCreating={isCreating} 
                />
              </form>
            </Form>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
