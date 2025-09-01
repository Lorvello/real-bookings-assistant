import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator,
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  CreditCard,
  FileCheck,
  TrendingUp,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AutoTaxServiceCreation } from '@/components/settings/service-types/AutoTaxServiceCreation';

interface TaxDashboardProps {
  calendarId: string;
}

interface TaxMetrics {
  totalServices: number;
  taxEnabledServices: number;
  countries: number;
  complianceScore: number;
  taxReady: boolean;
}

interface ComplianceIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  action_required?: string;
}

interface ComplianceData {
  compliance_score: number;
  compliance_status: string;
  issues: ComplianceIssue[];
  summary: {
    total_issues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  recommendations: string[];
  last_checked?: string;
}

export const ConsistentTaxTab: React.FC<TaxDashboardProps> = ({ calendarId }) => {
  const [metrics, setMetrics] = useState<TaxMetrics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (calendarId) {
      fetchData();
    }
  }, [calendarId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch services
      const { data: services } = await supabase
        .from('service_types')
        .select('*')
        .eq('calendar_id', calendarId);

      const taxEnabledServices = services?.filter(s => s.tax_enabled) || [];
      const countries = [...new Set(services?.map(s => s.business_country).filter(Boolean))];
      
      setMetrics({
        totalServices: services?.length || 0,
        taxEnabledServices: taxEnabledServices.length,
        countries: countries.length,
        complianceScore: 85,
        taxReady: taxEnabledServices.length > 0 && countries.length > 0
      });

      // Fetch compliance data
      await checkCompliance();
    } catch (error) {
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCompliance = async () => {
    try {
      setChecking(true);
      
      const { data, error } = await supabase.functions.invoke('validate-tax-compliance', {
        body: { 
          test_mode: true, 
          calendar_id: calendarId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setCompliance(data);
      }
    } catch (error: any) {
      console.error('Compliance check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (ready: boolean) => {
    return ready ? 'text-green-400' : 'text-yellow-400';
  };

  const getStatusIcon = (ready: boolean) => {
    return ready ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading tax dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Tax Management
          </h2>
          <p className="text-gray-400 mt-1">
            Configure and monitor tax settings for your services
          </p>
        </div>
        <Button 
          onClick={checkCompliance}
          disabled={checking}
          variant="outline"
          className="border-gray-600 text-white hover:bg-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check Status'}
        </Button>
      </div>

      {/* Status Overview */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">Tax Configuration Status</CardTitle>
          <CardDescription className="text-gray-400">
            Overview of your tax setup and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Services */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Tax-Enabled Services</p>
                  <p className="text-gray-400 text-sm">
                    {metrics?.taxEnabledServices || 0} of {metrics?.totalServices || 0} services
                  </p>
                </div>
              </div>
              <div className={getStatusColor(metrics?.taxEnabledServices > 0)}>
                {getStatusIcon(metrics?.taxEnabledServices > 0)}
              </div>
            </div>

            {/* Countries */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Active Markets</p>
                  <p className="text-gray-400 text-sm">
                    {metrics?.countries || 0} countries configured
                  </p>
                </div>
              </div>
              <div className={getStatusColor(metrics?.countries > 0)}>
                {getStatusIcon(metrics?.countries > 0)}
              </div>
            </div>

            {/* Compliance */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Compliance Score</p>
                  <p className="text-gray-400 text-sm">
                    {compliance?.compliance_score || metrics?.complianceScore || 0}% compliant
                  </p>
                </div>
              </div>
              <div className={getStatusColor((compliance?.compliance_score || 0) > 80)}>
                {getStatusIcon((compliance?.compliance_score || 0) > 80)}
              </div>
            </div>
          </div>

          {/* Overall Status */}
          <div className="mt-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${metrics?.taxReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-white font-medium">
                  {metrics?.taxReady ? 'Tax System Ready' : 'Configuration Required'}
                </span>
              </div>
              <Badge variant={metrics?.taxReady ? 'default' : 'secondary'}>
                {metrics?.taxReady ? 'Active' : 'Setup Needed'}
              </Badge>
            </div>
            {!metrics?.taxReady && (
              <p className="text-gray-400 text-sm mt-2">
                Configure tax settings for your services to enable tax collection
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card className="bg-gray-800 border-gray-700">
        <Tabs defaultValue="setup" className="p-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700 border-gray-600">
            <TabsTrigger value="setup" className="data-[state=active]:bg-gray-600 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Quick Setup
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-gray-600 text-white">
              <Shield className="w-4 h-4 mr-2" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-600 text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6 mt-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Automated Service Creation
              </h3>
              <p className="text-gray-400">
                AI-powered service creation with automatic tax configuration
              </p>
            </div>
            <AutoTaxServiceCreation 
              calendarId={calendarId}
              onServiceCreated={fetchData}
            />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6 mt-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Compliance Monitoring
              </h3>
              <p className="text-gray-400">
                Real-time monitoring of tax compliance status
              </p>
            </div>

            {compliance && (
              <div className="space-y-4">
                {/* Compliance Score */}
                <Card className="bg-gray-700/50 border-gray-600">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Compliance Score</h4>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {compliance.compliance_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="text-3xl font-bold text-white">
                        {compliance.compliance_score}%
                      </div>
                      <Progress 
                        value={compliance.compliance_score} 
                        className="h-2 bg-gray-600"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Issues */}
                {compliance.issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Issues to Address</h4>
                    {compliance.issues.map((issue, index) => (
                      <Alert 
                        key={index}
                        className={`${
                          issue.type === 'error' 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : issue.type === 'warning'
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-blue-500/10 border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {issue.type === 'error' ? (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          ) : issue.type === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <Info className="w-5 h-5 text-blue-400" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">
                                {issue.category.replace('_', ' ').toUpperCase()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {issue.type.toUpperCase()}
                              </Badge>
                            </div>
                            <AlertDescription>
                              <p className="text-gray-300 mb-2">{issue.message}</p>
                              {issue.action_required && (
                                <p className="text-gray-400 text-sm">
                                  <strong>Action:</strong> {issue.action_required}
                                </p>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {compliance.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-white">Recommendations</h4>
                    <div className="grid gap-3">
                      {compliance.recommendations.map((rec, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                          <p className="text-gray-300 text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Perfect State */}
            {compliance?.issues.length === 0 && (
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Fully Compliant
                  </h3>
                  <p className="text-gray-300">
                    Your tax configuration meets all requirements
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Tax Analytics
              </h3>
              <p className="text-gray-400">
                Performance insights and tax collection analytics
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Services</span>
                      <span className="text-white font-semibold">{metrics?.totalServices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax-Enabled Services</span>
                      <span className="text-white font-semibold">{metrics?.taxEnabledServices || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Markets</span>
                      <span className="text-white font-semibold">{metrics?.countries || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax Coverage</span>
                      <span className="text-green-400 font-semibold">
                        {metrics?.totalServices > 0 
                          ? Math.round((metrics.taxEnabledServices / metrics.totalServices) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Configuration</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${metrics?.taxReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <span className="text-white font-semibold">
                          {metrics?.taxReady ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Compliance Score</span>
                      <span className="text-white font-semibold">
                        {compliance?.compliance_score || metrics?.complianceScore || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Issues</span>
                      <span className={`font-semibold ${
                        (compliance?.summary.errors || 0) > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {compliance?.summary.total_issues || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Last Check</span>
                      <span className="text-gray-300 text-sm">
                        {compliance?.last_checked 
                          ? new Date(compliance.last_checked).toLocaleDateString()
                          : 'Not checked'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};