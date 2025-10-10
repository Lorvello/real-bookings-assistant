import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WhatsAppBookingAssistant } from '@/components/whatsapp/WhatsAppBookingAssistant';
import { WhatsAppNotAvailable } from '@/components/whatsapp/WhatsAppNotAvailable';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { useAuth } from '@/hooks/useAuth';
export default function WhatsAppBookingAssistantPage() {
  const {
    user
  } = useAuth();
  const {
    userStatus
  } = useUserStatus();
  if (!user) {
    return <DashboardLayout>
        <div className="bg-gray-900 min-h-full p-3 sm:p-4 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground">Niet ingelogd</p>
            </div>
          </div>
        </div>
      </DashboardLayout>;
  }

  // Show inline upgrade page for expired trial or inactive users
  if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
    return <DashboardLayout>
        <div className="bg-gray-900 min-h-full p-3 sm:p-4 md:p-8">
          <WhatsAppNotAvailable />
        </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-3 sm:p-4 md:p-8">
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="space-y-2">
            <SimplePageHeader title="WhatsApp Booking Assistant" />
            
          </div>
          <WhatsAppBookingAssistant userId={user.id} />
        </div>
      </div>
    </DashboardLayout>;
}