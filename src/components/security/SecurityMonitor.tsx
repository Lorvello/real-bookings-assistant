// Security monitoring component for development/admin use
// Displays security events and system health

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Activity } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  ip_address: any;
  user_id?: string;
  created_at: string;
  event_data: any;
}

interface PaymentSecurityLog {
  id: string;
  event_type: string;
  severity: string;
  block_reason?: string;
  created_at: string;
}

export const SecurityMonitor: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentSecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSecurityData = async () => {
      try {
        // Fetch security events
        const { data: events } = await supabase
          .from('security_events')
          .select('id, event_type, ip_address, user_id, event_data, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch payment security logs
        const { data: payments } = await supabase
          .from('payment_security_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        setSecurityEvents(events || []);
        setPaymentLogs(payments || []);
      } catch (error) {
        console.error('Failed to fetch security data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();

    // Set up real-time subscription for security events
    const subscription = supabase
      .channel('security_monitor')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'security_events' },
        (payload) => {
          setSecurityEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_security_logs' },
        (payload) => {
          setPaymentLogs(prev => [payload.new as PaymentSecurityLog, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || loading) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const criticalEvents = securityEvents.filter(e => e.event_type.includes('critical')).length;
  const highEvents = securityEvents.filter(e => e.event_type.includes('blocked')).length;
  const blockedAttempts = paymentLogs.filter(p => p.block_reason).length;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highEvents}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Attempts</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{blockedAttempts}</div>
            <p className="text-xs text-muted-foreground">Security blocks active</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Event Details */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>Recent security events and monitoring data</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events">
            <TabsList>
              <TabsTrigger value="events">System Events</TabsTrigger>
              <TabsTrigger value="payments">Payment Security</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              {securityEvents.length === 0 ? (
                <p className="text-muted-foreground">No security events recorded</p>
              ) : (
                securityEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {event.event_type}
                        </Badge>
                        <span className="font-medium">Security Event</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        IP: {event.ip_address || 'Unknown'} • {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {paymentLogs.length === 0 ? (
                <p className="text-muted-foreground">No payment security events recorded</p>
              ) : (
                paymentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                        <span className="font-medium">{log.event_type}</span>
                      </div>
                      {log.block_reason && (
                        <p className="text-sm text-red-600">Blocked: {log.block_reason}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};