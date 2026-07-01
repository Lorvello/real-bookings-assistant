import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SecurityAuditDashboard = () => {
  // Fetch recent security events. Throw on error so a failed fetch surfaces as an error
  // state instead of silently rendering empty tables / zeroed cards (FQ-STATE-SECAUDIT).
  const {
    data: recentEvents,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_events_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch failed login attempts
  const {
    data: failedLogins,
    isLoading: loginsLoading,
    isError: loginsError,
    refetch: refetchLogins,
  } = useQuery({
    queryKey: ['failed-logins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .gte('attempt_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('attempt_time', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const isLoading = eventsLoading || loginsLoading;
  const isError = eventsError || loginsError;

  if (isLoading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center py-16">
        <div
          className="surface-raised fade-up flex max-w-md flex-col items-center gap-3 rounded-2xl px-8 py-12 text-center"
          role="alert"
        >
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Couldn't load the security audit</p>
          <p className="max-w-xs text-xs text-subtle-foreground">
            Something went wrong while loading security events. Please try again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { refetchEvents(); refetchLogins(); }}
            className="mt-1 gap-1.5"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // Aggregate failed logins by day
  const failedLoginsByDay = failedLogins?.reduce((acc, login) => {
    const day = new Date(login.attempt_time).toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(failedLoginsByDay || {}).map(([date, count]) => ({
    date,
    count
  }));

  // Calculate suspicious activity (high risk scores)
  const suspiciousEvents = recentEvents?.filter(e => (e.risk_score || 0) > 50);

  // Most accessed resources
  const resourceAccess: Record<string, number> = recentEvents
    ?.filter(e => e.event_category === 'data_access')
    .reduce((acc, event) => {
      const resource = event.resource_type || 'unknown';
      acc[resource] = (acc[resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Security Audit Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Security Events (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentEvents?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Login Attempts (7d)</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedLogins?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{suspiciousEvents?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Login Attempts Graph */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Login Attempts (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Security Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            tabIndex={0}
            role="region"
            aria-label="Recent security events"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Event Type</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">IP Address</th>
                  <th className="text-left p-2">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents?.slice(0, 20).map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="p-2">{event.event_type}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        event.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="p-2">{event.user_id?.substring(0, 8) || 'Anonymous'}</td>
                    <td className="p-2">{event.ip_address?.toString() || '-'}</td>
                    <td className="p-2">
                      <span className={`font-semibold ${
                        (event.risk_score || 0) > 70 ? 'text-red-600' :
                        (event.risk_score || 0) > 30 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {event.risk_score || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Most Accessed Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Most Accessed Resources (Last 50 Events)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(resourceAccess)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([resource, count]: [string, number]) => (
                <div key={resource} className="flex justify-between items-center">
                  <span className="font-medium">{resource}</span>
                  <span className="text-muted-foreground">{count} accesses</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
