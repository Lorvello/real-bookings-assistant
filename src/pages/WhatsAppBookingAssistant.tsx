import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { WhatsAppBookingAssistant } from '@/components/whatsapp/WhatsAppBookingAssistant';
import { WhatsAppNotAvailable } from '@/components/whatsapp/WhatsAppNotAvailable';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
export default function WhatsAppBookingAssistantPage() {
  const { t } = useTranslation('appPages');
  const { t: tApp } = useTranslation('app');
  const {
    user
  } = useAuth();
  const {
    userStatus
  } = useUserStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Route-level gate (R34, same class as P1-G1-REFINED / R9 881166a2 on
  // /test-ai-agent): AccessControlledNavigation's nav-click handler already
  // redirects setup-incomplete owners to /settings with a "Setup Required"
  // toast, but that check only fires on a sidebar click -- a direct URL visit
  // (typed, bookmarked, back/forward) bypassed it entirely. Unlike
  // /test-ai-agent this page doesn't silently fail when reached early (QR
  // generation genuinely works pre-setup), but it undermines the "Complete
  // Setup" checklist's own gating intent, so both entry paths are made
  // consistent here too. Guarded on isStatusLoading so the one-time status
  // fetch on mount can't cause a false-positive redirect.
  useEffect(() => {
    if (userStatus.isStatusLoading) return;
    if (userStatus.isSetupIncomplete) {
      toast({
        title: tApp('app.toast.setupRequiredTitle', 'Setup Required'),
        description: tApp('app.toast.setupRequiredDesc', 'Complete your account setup to access this feature.'),
        variant: 'destructive',
      });
      navigate('/settings', { replace: true });
    }
  }, [userStatus.isStatusLoading, userStatus.isSetupIncomplete, navigate, toast, tApp]);

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
      <div className="bg-background min-h-full p-3 sm:p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">{t('waPage.notLoggedIn', 'Not logged in')}</p>
          </div>
        </div>
      </div>
      </DashboardLayout>;
  }

  // Show inline upgrade page for expired trial or inactive users
  if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
    return <DashboardLayout>
      <div className="bg-background min-h-full p-3 sm:p-4 md:p-8">
        <WhatsAppNotAvailable />
      </div>
      </DashboardLayout>;
  }

  // While setup-incomplete, render nothing (the effect above is already
  // navigating away) instead of flashing the QR page for one frame.
  if (!userStatus.isStatusLoading && userStatus.isSetupIncomplete) {
    return null;
  }

  return <DashboardLayout>
    <div className="bg-background min-h-full p-3 sm:p-4 md:p-8">
      <div className="space-y-3 md:space-y-6">
        <div className="space-y-2">
          <SimplePageHeader title={t('waPage.header.title', 'WhatsApp Booking Assistant')} />
        </div>
        <WhatsAppBookingAssistant userId={user.id} />
      </div>
    </div>
    </DashboardLayout>;
}