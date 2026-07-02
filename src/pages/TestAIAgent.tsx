
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { ExpiredTrialOverlay } from '@/components/user-status/ExpiredTrialOverlay';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';

export default function TestAIAgent() {
  const { t } = useTranslation('appPages');
  const { t: tApp } = useTranslation('app');
  const { userStatus } = useUserStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Route-level gate (P1-G1-REFINED): AccessControlledNavigation's nav-click
  // handler already redirects setup-incomplete owners to /settings with a
  // "Setup Required" toast (src/components/user-status/AccessControlledNavigation.tsx),
  // but that check only fires on a sidebar click. A direct URL visit (typed,
  // bookmarked, browser back/forward, or a stale cached page) bypassed it
  // entirely and rendered a fully interactive-looking "Live" chat that then
  // silently failed on every message, because the agent has no business data
  // to answer from yet. This effect applies the exact same check + same toast
  // copy at the page itself, so both entry paths are consistently gated.
  // Guarded on isStatusLoading so the one-time status fetch on mount can't
  // cause a false-positive redirect before userStatus is known.
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

  // While setup-incomplete, render nothing (the effect above is already
  // navigating away) instead of flashing the live chat for one frame.
  if (!userStatus.isStatusLoading && userStatus.isSetupIncomplete) {
    return null;
  }

  const pageContent = (
    <div className="bg-background min-h-full p-3 sm:p-4 md:p-8">
      <div className="space-y-3 md:space-y-6">
        <SimplePageHeader title={t('testAgentPage.header', 'Test AI Agent')} />

        <div className="surface-raised rounded-xl h-[600px] md:h-[700px] overflow-hidden">
          {/* framed={false}: the surface-raised wrapper is the single app-standard frame; the chat fills it
              seamlessly (no redundant inner border/radius/shadow = no double-ring).
              Owner-facing copy (this is the tenant testing THEIR configured agent, not a marketing demo). */}
          <AIAgentTestChat
            framed={false}
            title={t('testAgentPage.title', 'Your AI Agent')}
            greeting={t('testAgentPage.greeting', "Hi, I'm your AI booking assistant. Ask me anything a customer might.")}
            hint={t('testAgentPage.hint', 'Press Enter to send')}
            suggestedPrompts={[
              t('testAgentPage.suggestion1', 'What are your opening hours?'),
              t('testAgentPage.suggestion2', 'How do I book an appointment?'),
              t('testAgentPage.suggestion3', 'Where are you located?'),
              t('testAgentPage.suggestion4', 'Can I cancel or reschedule?'),
            ]}
          />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {(userStatus.userType === 'expired_trial' || 
        userStatus.userType === 'canceled_and_inactive') ? (
        <ExpiredTrialOverlay>
          {pageContent}
        </ExpiredTrialOverlay>
      ) : (
        pageContent
      )}
    </DashboardLayout>
  );
}
