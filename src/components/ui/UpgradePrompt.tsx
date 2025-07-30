import React, { useState } from 'react';
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
            <CardTitle className="text-lg">Upgrade Required</CardTitle>
          </div>
          <CardDescription>
            You've reached the limit for {feature.toLowerCase()} on your current plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current usage:</span>
              <span className="font-medium">{currentUsage}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan limit:</span>
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
            Upgrade to Professional
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Get unlimited {feature.toLowerCase()} and more with Professional plan
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