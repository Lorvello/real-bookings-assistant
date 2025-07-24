
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WhatsAppBookingAssistant } from '@/components/whatsapp/WhatsAppBookingAssistant';
import { WhatsAppNotAvailable } from '@/components/whatsapp/WhatsAppNotAvailable';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';

export default function WhatsAppBookingAssistantPage() {
  const { selectedCalendar } = useCalendarContext();
  const { userStatus } = useUserStatus();

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

  // Show inline upgrade page for expired trial or inactive users
  if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
    return (
      <DashboardLayout>
        <div className="bg-gray-900 min-h-full p-2 md:p-8">
          <WhatsAppNotAvailable />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        <div className="space-y-3 md:space-y-6">
          <SimplePageHeader title="WhatsApp Booking Assistant" />
          <CalendarSwitcher />
          <WhatsAppBookingAssistant calendarId={selectedCalendar.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}
