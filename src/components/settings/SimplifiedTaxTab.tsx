import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Crown, 
  Lock, 
  CheckCircle2,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { TaxManagementPage } from './TaxManagementPage';

export const SimplifiedTaxTab = () => {
  const navigate = useNavigate();
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { getStripeAccount, createOnboardingLink, refreshAccountStatus } = useStripeConnect();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);

  const hasAccess = checkAccess('canAccessTaxCompliance');

  useEffect(() => {
    if (hasAccess && selectedCalendar?.id) {
      checkStripeAccountStatus();
    }
  }, [hasAccess, selectedCalendar?.id]);

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripe(true);
      
      // First check if there's a local account - if not, don't try to refresh
      const localAccount = await getStripeAccount();
      
      if (!localAccount) {
        // No account exists, no need to call refresh endpoint
        setStripeAccount(null);
        return;
      }
      
      // Only refresh if we have an existing account
      const freshAccount = await refreshAccountStatus();
      setStripeAccount(freshAccount || localAccount);
    } catch (error) {
      console.error('Failed to check Stripe account:', error);
      const localAccount = await getStripeAccount();
      setStripeAccount(localAccount);
    } finally {
      setCheckingStripe(false);
    }
  };

  // Locked state for users without Professional access
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Tax Management
          </h2>
          <p className="text-gray-400 mt-1">
            Professional tax compliance and management features
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold text-white">
              Premium Feature
            </CardTitle>
            <CardDescription className="text-gray-400">
              Tax management is available for Professional users
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span>Advanced tax compliance monitoring</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span>Automated service tax configuration</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span>Multi-country tax management</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span>Real-time compliance analytics</span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
            >
              Upgrade to Professional
            </Button>
          </CardContent>
        </Card>

        <SubscriptionModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userType={userStatus.userType}
        />
      </div>
    );
  }

  // Show loading state while checking Stripe account
  if (checkingStripe) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Checking Stripe account status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show Stripe onboarding if not completed
  if (!stripeAccount?.onboarding_completed) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Tax Management
          </h2>
          <p className="text-gray-400 mt-1">
            Configure and monitor tax settings for your services
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold text-white">
              Stripe Setup Required
            </CardTitle>
            <CardDescription className="text-gray-400">
              Complete your Stripe onboarding to enable tax features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-300">
              Tax management requires Stripe to be configured for payment processing.
            </p>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              Setup Required
            </Badge>
            <div className="pt-4">
              <Button 
                onClick={() => navigate('/settings?tab=payments')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Return consistent tax interface
  if (!selectedCalendar?.id) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">Please select a calendar to manage tax settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TaxManagementPage />;
};