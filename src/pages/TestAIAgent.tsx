
import React from 'react';
import { useTranslation } from 'react-i18next';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { ExpiredTrialOverlay } from '@/components/user-status/ExpiredTrialOverlay';
import { useUserStatus } from '@/contexts/UserStatusContext';

export default function TestAIAgent() {
  const { t } = useTranslation('appPages');
  const { userStatus } = useUserStatus();

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
