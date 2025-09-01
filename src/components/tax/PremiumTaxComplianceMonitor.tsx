import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  RefreshCw,
  Loader2,
  FileCheck,
  CreditCard,
  Settings,
  Globe,
  Crown,
  Sparkles,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import StaggeredAnimationContainer from '@/components/StaggeredAnimationContainer';

interface ComplianceIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
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
  last_checked: string;
}

interface PremiumTaxComplianceMonitorProps {
  calendarId: string;
}

export const PremiumTaxComplianceMonitor = ({ calendarId }: PremiumTaxComplianceMonitorProps) => {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (calendarId) {
      checkCompliance();
    }
  }, [calendarId]);

  const checkCompliance = async () => {
    try {
      setChecking(true);
      if (!loading) setLoading(false);
      
      const { data, error } = await supabase.functions.invoke('validate-tax-compliance', {
        body: { 
          test_mode: true, 
          calendar_id: calendarId 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setCompliance(data);
      } else {
        throw new Error(data?.error || 'Failed to check compliance');
      }
    } catch (error: any) {
      console.error('Compliance check failed:', error);
      toast({
        title: "Enterprise Validation Failed",
        description: error.message || "Could not validate tax compliance systems",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const getComplianceGradient = (status: string) => {
    switch (status) {
      case 'excellent': return 'from-emerald-500 to-green-500';
      case 'good': return 'from-blue-500 to-cyan-500';
      case 'needs_improvement': return 'from-amber-500 to-orange-500';
      case 'critical': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellence Achieved';
      case 'good': return 'Systems Operational';
      case 'needs_improvement': return 'Optimization Required';
      case 'critical': return 'Immediate Action Required';
      default: return 'Status Unknown';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stripe_setup': return <CreditCard className="w-5 h-5 text-blue-400" />;
      case 'tax_registration': return <Globe className="w-5 h-5 text-emerald-400" />;
      case 'service_configuration': return <Settings className="w-5 h-5 text-purple-400" />;
      case 'stripe_integration': return <CreditCard className="w-5 h-5 text-blue-400" />;
      case 'tax_configuration': return <FileCheck className="w-5 h-5 text-green-400" />;
      case 'compliance_requirement': return <Shield className="w-5 h-5 text-amber-400" />;
      default: return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/20 backdrop-blur-xl border-white/10">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Analyzing Enterprise Compliance</h3>
          <p className="text-white/60">Validating tax infrastructure and regulatory compliance...</p>
        </CardContent>
      </Card>
    );
  }

  if (!compliance) {
    return (
      <Card className="bg-card/20 backdrop-blur-xl border-white/10">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Compliance Check Failed</h3>
          <p className="text-white/60 mb-6">
            Unable to validate enterprise tax systems
          </p>
          <Button 
            onClick={checkCompliance} 
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Executive Compliance Overview */}
      <Card className="bg-card/20 backdrop-blur-xl border-white/10 overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${getComplianceGradient(compliance.compliance_status)}`} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${getComplianceGradient(compliance.compliance_status)} rounded-xl flex items-center justify-center`}>
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  Compliance Excellence Center
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </CardTitle>
                <CardDescription className="text-white/60 text-lg">
                  Enterprise-grade tax compliance monitoring and validation
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={checkCompliance} 
              variant="outline" 
              size="lg"
              disabled={checking}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              {checking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span className="ml-2">
                {checking ? 'Validating...' : 'Refresh Analysis'}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-bold text-white">
                  {compliance.compliance_score}%
                </h3>
                <Badge className={`bg-gradient-to-r ${getComplianceGradient(compliance.compliance_status)} text-white px-4 py-2 text-sm font-medium`}>
                  {getComplianceLabel(compliance.compliance_status)}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <Progress 
                  value={compliance.compliance_score} 
                  className="h-3 bg-white/10"
                />
                <p className="text-white/60 text-sm">
                  Last validated: {new Date(compliance.last_checked).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{compliance.summary.errors}</div>
                <div className="text-red-300 text-sm">Critical Issues</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{compliance.summary.warnings}</div>
                <div className="text-amber-300 text-sm">Optimizations</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{compliance.summary.info}</div>
                <div className="text-blue-300 text-sm">Information</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {100 - compliance.summary.total_issues}%
                </div>
                <div className="text-emerald-300 text-sm">Health Score</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Analysis */}
      {compliance.issues.length > 0 && (
        <Card className="bg-card/20 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Compliance Analysis
            </CardTitle>
            <CardDescription className="text-white/60">
              Detailed analysis of compliance issues requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaggeredAnimationContainer className="space-y-4">
              {compliance.issues.map((issue, index) => (
                <Alert 
                  key={index} 
                  className={`${
                    issue.type === 'error' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : issue.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  } backdrop-blur-sm`}
                >
                  <div className="flex items-start gap-4">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getCategoryIcon(issue.category)}
                        <span className="text-white font-medium capitalize">
                          {issue.category.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                          {issue.type.toUpperCase()}
                        </Badge>
                      </div>
                      <AlertDescription>
                        <div className="text-white/90 font-medium mb-2">{issue.message}</div>
                        {issue.action_required && (
                          <div className="text-white/70 text-sm mb-2">
                            <strong>Action Required:</strong> {issue.action_required}
                          </div>
                        )}
                        {issue.details && (
                          <details className="mt-3">
                            <summary className="text-sm cursor-pointer text-white/60 hover:text-white/80 transition-colors">
                              View Technical Details
                            </summary>
                            <pre className="text-xs mt-2 p-3 bg-black/20 rounded border border-white/10 overflow-auto text-white/80">
                              {JSON.stringify(issue.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </StaggeredAnimationContainer>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      {compliance.recommendations.length > 0 && (
        <Card className="bg-card/20 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Strategic Recommendations
            </CardTitle>
            <CardDescription className="text-white/60">
              AI-powered optimization suggestions for enhanced compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {compliance.recommendations.map((recommendation, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                  <p className="text-white/90 text-sm leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfect Compliance State */}
      {compliance.issues.length === 0 && (
        <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Excellence Achieved!</h3>
            <p className="text-white/80 text-lg mb-4">
              Your enterprise tax infrastructure exceeds all compliance requirements.
            </p>
            <div className="flex items-center justify-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Enterprise Grade • Fully Compliant • Optimized</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};