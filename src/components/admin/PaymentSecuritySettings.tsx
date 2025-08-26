import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShieldIcon, AlertTriangleIcon, TrendingUpIcon } from 'lucide-react';

interface PaymentSecuritySettings {
  id?: string;
  calendar_id: string;
  rate_limit_attempts: number;
  rate_limit_window_minutes: number;
  min_payment_amount_cents: number;
  max_payment_amount_cents: number;
  blocked_countries: string[];
  require_captcha_threshold: number;
  card_testing_detection_enabled: boolean;
  suspicious_amount_threshold_cents: number;
  max_cards_per_user_per_day: number;
  new_user_payment_delay_hours: number;
}

interface PaymentSecurityLog {
  id: string;
  event_type: string;
  ip_address: unknown;
  amount_cents?: number;
  severity: string;
  block_reason?: string;
  created_at: string;
}

interface PaymentSecuritySettingsProps {
  calendarId: string;
}

export function PaymentSecuritySettings({ calendarId }: PaymentSecuritySettingsProps) {
  const [settings, setSettings] = useState<PaymentSecuritySettings>({
    calendar_id: calendarId,
    rate_limit_attempts: 3,
    rate_limit_window_minutes: 10,
    min_payment_amount_cents: 500, // €5.00
    max_payment_amount_cents: 50000, // €500.00
    blocked_countries: [],
    require_captcha_threshold: 2,
    card_testing_detection_enabled: true,
    suspicious_amount_threshold_cents: 100, // €1.00
    max_cards_per_user_per_day: 3,
    new_user_payment_delay_hours: 24,
  });
  
  const [recentLogs, setRecentLogs] = useState<PaymentSecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedCountriesText, setBlockedCountriesText] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchRecentLogs();
  }, [calendarId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_security_settings')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setBlockedCountriesText(data.blocked_countries?.join(', ') || '');
      }
    } catch (error) {
      console.error('Error fetching security settings:', error);
      toast({
        title: "Error",
        description: "Failed to load security settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error) {
      console.error('Error fetching security logs:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        blocked_countries: blockedCountriesText
          .split(',')
          .map(country => country.trim().toUpperCase())
          .filter(country => country.length > 0),
      };

      const { error } = await supabase
        .from('payment_security_settings')
        .upsert(settingsToSave);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Security settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Error",
        description: "Failed to save security settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatAmount = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return <div>Loading security settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Payment Security Settings
          </CardTitle>
          <CardDescription>
            Configure security measures to protect against card testing and fraudulent payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rate Limiting */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rate Limiting</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate_limit_attempts">Max Attempts</Label>
                <Input
                  id="rate_limit_attempts"
                  type="number"
                  value={settings.rate_limit_attempts}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    rate_limit_attempts: parseInt(e.target.value) || 3
                  }))}
                  min="1"
                  max="10"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum payment attempts per IP address
                </p>
              </div>
              <div>
                <Label htmlFor="rate_limit_window">Time Window (minutes)</Label>
                <Input
                  id="rate_limit_window"
                  type="number"
                  value={settings.rate_limit_window_minutes}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    rate_limit_window_minutes: parseInt(e.target.value) || 10
                  }))}
                  min="5"
                  max="60"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Time window for rate limiting
                </p>
              </div>
            </div>
          </div>

          {/* Amount Validation */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Amount Validation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_amount">Minimum Amount (cents)</Label>
                <Input
                  id="min_amount"
                  type="number"
                  value={settings.min_payment_amount_cents}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    min_payment_amount_cents: parseInt(e.target.value) || 500
                  }))}
                  min="50"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Current: {formatAmount(settings.min_payment_amount_cents)}
                </p>
              </div>
              <div>
                <Label htmlFor="max_amount">Maximum Amount (cents)</Label>
                <Input
                  id="max_amount"
                  type="number"
                  value={settings.max_payment_amount_cents}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    max_payment_amount_cents: parseInt(e.target.value) || 50000
                  }))}
                  min="1000"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Current: {formatAmount(settings.max_payment_amount_cents)}
                </p>
              </div>
            </div>
          </div>

          {/* Card Testing Protection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Card Testing Protection</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="card_testing_detection"
                checked={settings.card_testing_detection_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  card_testing_detection_enabled: checked
                }))}
              />
              <Label htmlFor="card_testing_detection">Enable card testing detection</Label>
            </div>
            
            {settings.card_testing_detection_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suspicious_threshold">Suspicious Amount Threshold (cents)</Label>
                  <Input
                    id="suspicious_threshold"
                    type="number"
                    value={settings.suspicious_amount_threshold_cents}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      suspicious_amount_threshold_cents: parseInt(e.target.value) || 100
                    }))}
                    min="10"
                    max="1000"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Flag amounts under {formatAmount(settings.suspicious_amount_threshold_cents)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="max_cards_per_day">Max Cards per User per Day</Label>
                  <Input
                    id="max_cards_per_day"
                    type="number"
                    value={settings.max_cards_per_user_per_day}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      max_cards_per_user_per_day: parseInt(e.target.value) || 3
                    }))}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Geographic Restrictions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Geographic Restrictions</h3>
            <div>
              <Label htmlFor="blocked_countries">Blocked Countries (comma-separated country codes)</Label>
              <Textarea
                id="blocked_countries"
                value={blockedCountriesText}
                onChange={(e) => setBlockedCountriesText(e.target.value)}
                placeholder="US, CN, RU (example)"
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use ISO 3166-1 alpha-2 country codes (e.g., US, CN, RU)
              </p>
            </div>
          </div>

          {/* New User Protection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">New User Protection</h3>
            <div>
              <Label htmlFor="new_user_delay">Payment Delay for New Users (hours)</Label>
              <Input
                id="new_user_delay"
                type="number"
                value={settings.new_user_payment_delay_hours}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  new_user_payment_delay_hours: parseInt(e.target.value) || 24
                }))}
                min="0"
                max="168"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minimum account age before payments are allowed
              </p>
            </div>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Latest security events and blocked attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-muted-foreground">No recent security events</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(log.severity)}>
                      {log.severity}
                    </Badge>
                    <div>
                      <p className="font-medium">{log.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        IP: {String(log.ip_address)}
                        {log.amount_cents && ` • Amount: ${formatAmount(log.amount_cents)}`}
                      </p>
                      {log.block_reason && (
                        <p className="text-sm text-red-600">{log.block_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={fetchRecentLogs}
            className="w-full mt-4"
          >
            Refresh Logs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}