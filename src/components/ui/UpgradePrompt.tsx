import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, ArrowRight } from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface UpgradePromptProps {
  feature: string;
  currentUsage: string;
  limit: string;
  description?: string;
  onUpgrade?: () => void;
  className?: string;
}

export function UpgradePrompt({ 
  feature, 
  currentUsage, 
  limit, 
  description, 
  onUpgrade,
  className = ""
}: UpgradePromptProps) {
  const { userStatus } = useUserStatus();
  const { t } = useTranslation('appPages');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowSubscriptionModal(true);
    }
  };

  return (
    <>
      <Card className={`border-warning/50 bg-warning/5 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">{t('upgradePrompt.title', 'Upgrade Required')}</CardTitle>
          </div>
          <CardDescription>
            {t('upgradePrompt.reachedLimit', "You've reached the limit for {{feature}} on your current plan.", { feature: feature.toLowerCase() })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('upgradePrompt.currentUsage', 'Current usage:')}</span>
              <span className="font-medium">{currentUsage}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('upgradePrompt.planLimit', 'Plan limit:')}</span>
              <span className="font-medium">{limit}</span>
            </div>
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
          
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Crown className="h-4 w-4 mr-2" />
            {t('upgradePrompt.upgradeButton', 'Upgrade to Professional')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            {t('upgradePrompt.unlimited', 'Get unlimited {{feature}} and more with Professional plan', { feature: feature.toLowerCase() })}
          </p>
        </CardContent>
      </Card>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
    </>
  );
}