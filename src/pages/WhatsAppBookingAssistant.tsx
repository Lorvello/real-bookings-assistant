import React, { useEffect } from 'react';
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
  useEffect(() => {
    document.title = 'WhatsApp Booking Assistant | QR Code & Best Practices';
    const desc = document.querySelector('meta[name="description"]');
    const content = 'Generate your WhatsApp QR code, preview messages, see how it works, and follow best practices.';
    if (desc) {
      desc.setAttribute('content', content);
    } else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
    const existingCanonical = document.querySelector('link[rel="canonical"]');
    const href = `${window.location.origin}/whatsapp-booking-assistant`;
    if (existingCanonical) {
      existingCanonical.setAttribute('href', href);
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);
  if (!user) {
    return <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-1 md:p-8">
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
      <div className="bg-gray-900 min-h-full p-1 md:p-8">
        <WhatsAppNotAvailable />
      </div>
      </DashboardLayout>;
  }
  return <DashboardLayout>
    <div className="bg-gray-900 min-h-full p-1 md:p-8">
      <div className="space-y-1 md:space-y-6">
        <div className="space-y-2">
          <SimplePageHeader title="WhatsApp Booking Assistant" />
        </div>
        <WhatsAppBookingAssistant userId={user.id} />
      </div>
    </div>
    </DashboardLayout>;
}