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
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface TaxComplianceMonitorProps {
  calendarId: string;
}

export const TaxComplianceMonitor = ({ calendarId }: TaxComplianceMonitorProps) => {
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
      if (!loading) setLoading(false); // Only show full loading on initial load
      
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
        title: "Compliance Check Failed",
        description: error.message || "Could not validate tax compliance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'needs_improvement': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'needs_improvement': return 'Needs Improvement';
      case 'critical': return 'Critical Issues';
      default: return 'Unknown';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stripe_setup': return <CreditCard className="w-4 h-4" />;
      case 'tax_registration': return <Globe className="w-4 h-4" />;
      case 'service_configuration': return <Settings className="w-4 h-4" />;
      case 'stripe_integration': return <CreditCard className="w-4 h-4" />;
      case 'tax_configuration': return <FileCheck className="w-4 h-4" />;
      case 'compliance_requirement': return <Shield className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking tax compliance...</p>
        </CardContent>
      </Card>
    );
  }

  if (!compliance) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Could not check tax compliance
          </p>
          <Button onClick={checkCompliance} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Tax Compliance Monitor
              </CardTitle>
              <CardDescription>
                Real-time compliance status and recommendations
              </CardDescription>
            </div>
            <Button 
              onClick={checkCompliance} 
              variant="outline" 
              size="sm"
              disabled={checking}
            >
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold">{compliance.compliance_score}%</div>
              <Badge className={getComplianceColor(compliance.compliance_status)}>
                {getComplianceLabel(compliance.compliance_status)}
              </Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Last checked: {new Date(compliance.last_checked).toLocaleString()}
            </div>
          </div>
          
          <Progress value={compliance.compliance_score} className="mb-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold text-red-600">{compliance.summary.errors}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold text-yellow-600">{compliance.summary.warnings}</div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold text-blue-600">{compliance.summary.info}</div>
              <div className="text-xs text-muted-foreground">Info</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-semibold">{compliance.summary.total_issues}</div>
              <div className="text-xs text-muted-foreground">Total Issues</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {compliance.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Issues</CardTitle>
            <CardDescription>
              Issues that need attention to maintain compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {compliance.issues.map((issue, index) => (
                <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(issue.category)}
                        <span className="text-sm font-medium capitalize">
                          {issue.category.replace('_', ' ')}
                        </span>
                      </div>
                      <AlertDescription>
                        <div className="font-medium mb-1">{issue.message}</div>
                        {issue.action_required && (
                          <div className="text-sm text-muted-foreground">
                            Action required: {issue.action_required}
                          </div>
                        )}
                        {issue.details && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer text-muted-foreground">
                              View details
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(issue.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {compliance.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Steps to improve your tax compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {compliance.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {recommendation}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfect Compliance */}
      {compliance.issues.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Perfect Compliance!</h3>
            <p className="text-sm text-muted-foreground">
              Your tax setup meets all requirements. No issues detected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};