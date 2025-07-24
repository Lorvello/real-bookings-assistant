// Security Dashboard Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useSecurityContext } from './SecurityProvider';
import { threatDetector } from '@/lib/security';

export const SecurityDashboard: React.FC = () => {
  const { securityState, clearSecurityState } = useSecurityContext();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Get threat detection stats
    const detectionStats = threatDetector.getDetectionStats();
    setStats(detectionStats);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSecurityScore = () => {
    if (!securityState.isSecure) return 0;
    if (securityState.threats.length === 0) return 100;
    
    const avgConfidence = securityState.threats.reduce((sum: number, threat: any) => 
      sum + threat.confidence, 0) / securityState.threats.length;
    
    return Math.max(0, 100 - (avgConfidence * 100));
  };

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSecurityScore().toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {securityState.isSecure ? 'Secure' : 'At Risk'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityState.threats.length}</div>
            <p className="text-xs text-muted-foreground">
              Detected threats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
            {securityState.sessionValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityState.sessionValid ? 'Valid' : 'Invalid'}
            </div>
            <p className="text-xs text-muted-foreground">
              Session security
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CSRF Protection</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityState.csrfToken ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-muted-foreground">
              Token protection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {!securityState.isSecure && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Security threats detected. Review the threats tab for details.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Threats</CardTitle>
            </CardHeader>
            <CardContent>
              {securityState.threats.length === 0 ? (
                <p className="text-muted-foreground">No threats detected.</p>
              ) : (
                <div className="space-y-3">
                  {securityState.threats.map((threat: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(threat.severity) as any}>
                            {threat.severity}
                          </Badge>
                          <span className="font-medium">{threat.type}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(threat.confidence * 100).toFixed(1)}%
                        </div>
                        {threat.indicators && threat.indicators.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Indicators: {threat.indicators.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Detection Rules</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Total Rules: {stats?.totalRules || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enabled Rules: {stats?.enabledRules || 0}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Detection History</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    History Size: {stats?.detectionHistorySize || 0}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => threatDetector.clearHistory()}
                  >
                    Clear History
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Security Actions</h4>
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={clearSecurityState}
                  >
                    Reset Security State
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Security logs are stored in the database. Check the error_logs table 
                for detailed security events and threat detection logs.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};