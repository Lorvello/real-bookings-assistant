import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { useGlobalBotStatus } from '@/hooks/useGlobalBotStatus';
import { useAccessControl } from '@/hooks/useAccessControl';
import { WhatsAppUpgradeModal } from './WhatsAppUpgradeModal';

export function GlobalSettings() {
  const { t } = useTranslation('settings');
  const { data: botStatus, isLoading, toggleBot, isToggling } = useGlobalBotStatus();
  const { accessControl, userStatus } = useAccessControl();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const hasWhatsAppAccess = accessControl.canAccessWhatsApp;
  const isRestrictedUser = userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';
  const isActive = hasWhatsAppAccess ? (botStatus?.whatsapp_bot_active ?? false) : false;

  const handleWhatsAppBotToggle = (checked: boolean) => {
    if (!hasWhatsAppAccess && isRestrictedUser) {
      setShowUpgradeModal(true);
      return;
    }
    toggleBot(checked);
  };

  return (
    <>
      {/* One calm toggle row instead of a label + info-tooltip: premium products
          explain inline rather than hide the explanation behind an icon. */}
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-medium leading-[18px] text-foreground">{t('settings.operations.fields.whatsappBotActive.label', 'WhatsApp bot active')}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.operations.fields.whatsappBotActive.description', 'When on, the assistant replies to WhatsApp messages and books appointments for customers automatically. When off, it stays silent and no one receives a reply.')}
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={handleWhatsAppBotToggle}
          disabled={isLoading || isToggling || !hasWhatsAppAccess}
          aria-label={t('settings.operations.fields.whatsappBotActive.ariaLabel', 'WhatsApp bot active')}
          className={!hasWhatsAppAccess ? 'opacity-50' : ''}
        />
      </div>

      <WhatsAppUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userType={userStatus.userType}
      />
    </>
  );
}
