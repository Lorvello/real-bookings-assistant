import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Euro, Info, ChevronDown, X, Check, CreditCard, Shield } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useAccountRole } from '@/hooks/useAccountRole';
import { useToast } from '@/hooks/use-toast';

export function PaymentSettingsTab() {
  const { toast } = useToast();
  const { isAccountOwner, loading: roleLoading } = useAccountRole();
  const {
    settings,
    loading: settingsLoading,
    saving: settingsSaving,
    toggleSecurePayments
  } = usePaymentSettings();

  // UI state
  const [feesInfoOpen, setFeesInfoOpen] = useState(false);
  const [currencyConversionModalOpen, setCurrencyConversionModalOpen] = useState(false);

  // Auto-open fees section from URL hash
  useEffect(() => {
    const timer = setTimeout(() => {
      const fragment = window.location.hash;
      if (fragment === '#fees-section') {
        setFeesInfoOpen(true);
        const element = document.getElementById('fees-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleSecurePayments = async () => {
    try {
      await toggleSecurePayments(!settings?.secure_payments_enabled);
    } catch (error) {
      console.error('Error toggling secure payments:', error);
      toast({
        title: "Error",
        description: "Failed to update payment settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (roleLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAccountOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p>Only account owners can manage payment settings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods Fees Card */}
      {settings?.secure_payments_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-primary" />
              <span>Payment Processing Fees</span>
            </CardTitle>
            <CardDescription>
              Overview of processing fees and payment flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fees Section */}
            <Collapsible open={feesInfoOpen} onOpenChange={setFeesInfoOpen}>
              <div id="fees-section" className="bg-muted/30 border border-muted/40 p-3 rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-0.5">Fees</h4>
                      <p className="text-xs text-muted-foreground">Payment processing fees overview</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${feesInfoOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-3 space-y-4">
                    {/* Payment Methods Fees - Two Column Layout */}
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-3">Payment Methods Fees</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">iDEAL</span>
                          <span className="text-muted-foreground">€0.29</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Cards (EEA)</span>
                          <span className="text-muted-foreground">1.5% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Cards (UK)</span>
                          <span className="text-muted-foreground">2.5% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Cards (International)</span>
                          <span className="text-muted-foreground">3.25% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Apple Pay</span>
                          <span className="text-muted-foreground">Same as cards</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Bancontact</span>
                          <span className="text-muted-foreground">€0.35</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">BLIK</span>
                          <span className="text-muted-foreground">1.6% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">TWINT</span>
                          <span className="text-muted-foreground">1.9% + CHF 0.30</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Revolut Pay</span>
                          <span className="text-muted-foreground">1.5% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Sofort</span>
                          <span className="text-muted-foreground">1.4% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">EPS</span>
                          <span className="text-muted-foreground">1.6% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Przelewy24</span>
                          <span className="text-muted-foreground">2.2% + €0.30</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Pay by Bank</span>
                          <span className="text-muted-foreground">~1.5% + £0.20</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/20">
                          <span className="text-muted-foreground">Cartes Bancaires</span>
                          <span className="text-muted-foreground">Same as cards</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-1.5">
                          <span className="text-muted-foreground">Google Pay</span>
                          <span className="text-muted-foreground">Same as cards</span>
                        </div>
                      </div>
                    </div>

                    {/* Currency Conversion Fee Info */}
                    <div className="border-t border-muted/40 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="text-xs font-medium text-muted-foreground">Currency Conversion Fee</h5>
                        <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Additional 2% fee applies when customer payment currency differs from your account currency.
                      </p>
                    </div>

                    {/* Fee Impact Example */}
                    <div className="border-t border-muted/40 pt-3">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Fee Impact Example</h5>
                      <div className="bg-background/50 p-2 rounded border border-muted/40">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Booking amount:</span>
                            <span className="text-muted-foreground">€100.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment method fee (iDEAL):</span>
                            <span className="text-muted-foreground">-€0.29</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (1.9% + €0.25):</span>
                            <span className="text-muted-foreground">-€2.15</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stripe processing (0.25% + €0.10):</span>
                            <span className="text-muted-foreground">-€0.35</span>
                          </div>
                          <div className="border-t border-muted/40 pt-1 mt-1 flex justify-between">
                            <span className="text-muted-foreground font-medium">Net payout:</span>
                            <span className="text-muted-foreground font-medium">€97.21</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 opacity-75">
                        All fees are deducted from your total booking amount before payout
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Currency Conversion Modal */}
      {currencyConversionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card max-w-md w-full p-6 rounded-lg border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Currency Conversion Fee</h3>
              <button 
                onClick={() => setCurrencyConversionModalOpen(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p>Stripe applies an additional 2% fee if the payment currency differs from your account currency.</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Example: A UK customer pays £100 in GBP → funds are converted to EUR with a 2% markup on the exchange rate.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>This fee is charged on top of the normal payment processing fee.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Customers always see the charge in their own currency; the conversion happens on your side as the merchant.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>If the customer pays in the same currency as your account (e.g., EUR), this fee does not apply.</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground font-medium">
                  <strong>Tip:</strong> To avoid this fee, try to charge in the same currency as your Stripe account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic Payment Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Secure Payments</span>
          </CardTitle>
          <CardDescription>
            Enable secure payment processing for your bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3">
            <Switch
              id="secure-payments"
              checked={settings?.secure_payments_enabled || false}
              onCheckedChange={handleToggleSecurePayments}
              disabled={settingsSaving}
            />
            <Label htmlFor="secure-payments" className="text-sm font-medium">
              Enable secure payment processing
            </Label>
            {settingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}