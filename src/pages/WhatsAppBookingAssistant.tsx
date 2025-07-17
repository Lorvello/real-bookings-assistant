import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WhatsAppBookingAssistant } from '@/components/whatsapp/WhatsAppBookingAssistant';
import { useCalendarContext } from '@/contexts/CalendarContext';

export default function WhatsAppBookingAssistantPage() {
  const { selectedCalendar } = useCalendarContext();

  if (!selectedCalendar) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Geen kalender geselecteerd</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        <WhatsAppBookingAssistant calendarId={selectedCalendar.id} />
      </div>
    </DashboardLayout>
  );
}