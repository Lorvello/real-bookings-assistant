import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useGlobalBotStatus } from '@/hooks/useGlobalBotStatus';
import { useAccessControl } from '@/hooks/useAccessControl';
import { WhatsAppUpgradeModal } from './WhatsAppUpgradeModal';

interface GlobalSettingsProps {
  // Legacy props for compatibility - not used anymore
  settings?: any;
  onUpdate?: (updates: any) => void;
  calendarId?: string;
}

export function GlobalSettings({}: GlobalSettingsProps) {
  const { data: botStatus, isLoading, toggleBot, isToggling } = useGlobalBotStatus();
  const { accessControl, userStatus } = useAccessControl();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const hasWhatsAppAccess = accessControl.canAccessWhatsApp;
  const isRestrictedUser = userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

  const handleWhatsAppBotToggle = (checked: boolean) => {
    if (!hasWhatsAppAccess && isRestrictedUser) {
      setShowUpgradeModal(true);
      return;
    }
    toggleBot(checked);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* WhatsApp Bot Setting - Global */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">WhatsApp Bot Active</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>When enabled, the AI assistant responds to WhatsApp messages globally across all calendars. When disabled, the bot will not reply to customer messages.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable automated WhatsApp booking assistant (applies to all calendars)
            </p>
          </div>
          <Switch
            checked={hasWhatsAppAccess ? (botStatus?.whatsapp_bot_active ?? false) : false}
            onCheckedChange={handleWhatsAppBotToggle}
            disabled={isLoading || isToggling || !hasWhatsAppAccess}
            className={!hasWhatsAppAccess ? "opacity-50" : ""}
          />
        </div>
        
        <WhatsAppUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userType={userStatus.userType}
        />
      </div>
    </TooltipProvider>
  );
}