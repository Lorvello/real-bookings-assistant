import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Shield, 
  TrendingUp, 
  FileText, 
  Crown, 
  Lock, 
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Info
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';

export const TaxTab = () => {
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { settings } = usePaymentSettings(selectedCalendar?.id);
  const { toast } = useToast();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isProfessionalOrHigher = userStatus.userType === 'subscriber' && 
    (userStatus.statusMessage.includes('Professional') || userStatus.statusMessage.includes('Enterprise'));

  // Mock tax data for demonstration
  const mockTaxData = {
    currentMonth: {
      totalRevenue: 4850.00,
      vatCollected: 1019.50,
      vatRate: 21,
      transactions: 47,
      exemptTransactions: 2
    },
    quarterly: {
      q1: { revenue: 13240.00, vat: 2780.40 },
      q2: { revenue: 15680.00, vat: 3292.80 },
      q3: { revenue: 14520.00, vat: 3049.20 },
      q4: { revenue: 16180.00, vat: 3397.80 }
    },
    compliance: {
      lastReportGenerated: '2024-01-15',
      nextDueDate: '2024-04-01',
      status: 'compliant',
      autoSubmission: true
    }
  };

  useEffect(() => {
    if (isProfessionalOrHigher && selectedCalendar?.id) {
      loadTaxData();
    }
  }, [isProfessionalOrHigher, selectedCalendar?.id]);

  const loadTaxData = async () => {
    setLoading(true);
    try {
      // In real implementation, this would fetch actual tax data from Stripe
      // For now, simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTaxData(mockTaxData);
    } catch (error) {
      console.error('Error loading tax data:', error);
      toast({
        title: "Error",
        description: "Failed to load tax data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTaxData = async () => {
    setRefreshing(true);
    try {
      // Simulate refresh from Stripe
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadTaxData();
      toast({
        title: "Success",
        description: "Tax data refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh tax data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Report Generated",
        description: "Your tax report has been generated and will be emailed to you"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate tax report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Locked state for Starter tier users
  if (!isProfessionalOrHigher) {
    return (
      <div className="space-y-6">
        {/* Locked Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Professional Feature</h3>
                <p className="text-gray-300 max-w-md mx-auto">
                  Automated tax compliance & administration is available for Professional plan users and above.
                </p>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Professional
              </Button>
            </div>
          </div>

          {/* Blurred Content Preview */}
          <div className="opacity-30 pointer-events-none">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Tax Compliance Dashboard
                </CardTitle>
                <CardDescription>
                  Automated tax calculation, collection, and reporting for all your bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">Current Month Revenue</p>
                    <p className="text-2xl font-bold text-white">€4,850.00</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">VAT Collected</p>
                    <p className="text-2xl font-bold text-green-400">€1,019.50</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">Compliance Status</p>
                    <Badge className="bg-green-500/10 text-green-400">Compliant</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Benefits */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              What You Get with Professional Tax Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Automatic Tax Calculation</h4>
                    <p className="text-sm text-gray-400">VAT and taxes calculated automatically for all transactions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Multi-jurisdiction Support</h4>
                    <p className="text-sm text-gray-400">Handle customers from different countries with correct tax rates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Automated Reports</h4>
                    <p className="text-sm text-gray-400">Generate tax reports for easy filing with authorities</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Compliance Monitoring</h4>
                    <p className="text-sm text-gray-400">Real-time compliance status and alerts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Tax Rate Updates</h4>
                    <p className="text-sm text-gray-400">Automatic updates when tax rates change</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium">Audit Trail</h4>
                    <p className="text-sm text-gray-400">Complete audit trail for all tax-related transactions</p>
                  </div>
                </div>
              </div>
            </div>
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

  // Professional/Enterprise content
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Compliance & Administration</h1>
          <p className="text-gray-400 mt-1">Automated tax management powered by Stripe Tax</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Professional
          </Badge>
          <Button 
            onClick={handleRefreshTaxData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Tax Status Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Tax Overview
          </CardTitle>
          <CardDescription>
            Current month tax collection and compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">€{taxData?.currentMonth.totalRevenue?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{taxData?.currentMonth.transactions} transactions</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">VAT Collected</p>
                <p className="text-2xl font-bold text-green-400">€{taxData?.currentMonth.vatCollected?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{taxData?.currentMonth.vatRate}% average rate</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Compliance Status</p>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Compliant
                </Badge>
                <p className="text-xs text-gray-500">Next due: {taxData?.compliance.nextDueDate}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Auto Submission</p>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={taxData?.compliance.autoSubmission} 
                    disabled 
                  />
                  <span className="text-sm text-white">Enabled</span>
                </div>
                <p className="text-xs text-gray-500">Reports filed automatically</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quarterly Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quarterly Tax Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(taxData?.quarterly || {}).map(([quarter, data]: [string, any]) => (
              <div key={quarter} className="p-4 bg-gray-900/50 rounded-lg">
                <h4 className="text-white font-medium mb-2">{quarter.toUpperCase()}</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Revenue: €{data.revenue?.toLocaleString()}</p>
                  <p className="text-sm text-green-400">VAT: €{data.vat?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Tax Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Automatic Tax Calculation</Label>
                <p className="text-sm text-gray-400">Enable automatic tax calculation for all payments</p>
              </div>
              <Switch checked={true} disabled />
            </div>
            
            <Separator className="bg-gray-700" />
            
            <div className="space-y-3">
              <h4 className="text-white font-medium">Current Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Tax Rate</span>
                  <span className="text-white">21% (Netherlands VAT)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Multi-jurisdiction</span>
                  <span className="text-green-400">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax ID Validation</span>
                  <span className="text-green-400">Enabled</span>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-900/20 border-blue-700">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                Tax settings are automatically synchronized with your Stripe account and cannot be modified here.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Reports & Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Reports & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full justify-start"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Monthly Tax Report
              </Button>
              
              <Button 
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Quarterly Summary
              </Button>
              
              <Button 
                onClick={() => window.open('https://dashboard.stripe.com/tax', '_blank')}
                className="w-full justify-start"
                variant="outline"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Open Stripe Tax Dashboard
              </Button>
            </div>

            <Separator className="bg-gray-700" />

            <div className="space-y-2">
              <h4 className="text-white font-medium text-sm">Recent Activity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Last Report Generated</span>
                  <span className="text-white">{taxData?.compliance.lastReportGenerated}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Next Filing Due</span>
                  <span className="text-yellow-400">{taxData?.compliance.nextDueDate}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Stripe Tax</p>
                <p className="text-sm text-gray-400">Connected & Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Payment Processing</p>
                <p className="text-sm text-gray-400">Tax calculation enabled</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Compliance Monitoring</p>
                <p className="text-sm text-gray-400">Real-time tracking active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};