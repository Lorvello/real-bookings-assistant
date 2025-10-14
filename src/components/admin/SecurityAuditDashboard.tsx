import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SecurityAuditDashboard = () => {
  // Fetch recent security events
  const { data: recentEvents } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('security_events_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    }
  });

  // Fetch failed login attempts
  const { data: failedLogins } = useQuery({
    queryKey: ['failed-logins'],
    queryFn: async () => {
      const { data } = await supabase
        .from('failed_login_attempts')
        .select('*')
        .gte('attempt_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('attempt_time', { ascending: true });
      return data || [];
    }
  });

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
          <div className="overflow-x-auto">
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
