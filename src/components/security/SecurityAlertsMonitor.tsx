// Security monitoring component for production environments
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/utils/secureLogger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Info } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  event_data?: any;
  user_id?: string;
  ip_address?: any;
  user_agent?: string;
}

export function SecurityAlertsMonitor() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or for admin users
    const isDev = import.meta.env.DEV;
    if (!isDev) return;

    setIsVisible(true);
    fetchRecentSecurityEvents();

    // Set up real-time subscription for security events
    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_events'
      }, (payload) => {
        secureLogger.security('New security event detected', { 
          event: payload.new.event_type,
          severity: payload.new.severity 
        });
        
        setSecurityEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRecentSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        secureLogger.error('Failed to fetch security events', error);
        return;
      }

      setSecurityEvents(data || []);
    } catch (error) {
      secureLogger.error('Security events fetch error', error);
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityVariant = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!isVisible || securityEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-background border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Security Monitor</h3>
        <Badge variant="outline" className="text-xs">
          Dev Mode
        </Badge>
      </div>
      
      <div className="space-y-2">
        {securityEvents.map((event) => (
          <Alert key={event.id} className="p-3">
            <div className="flex items-start gap-2">
              {getSeverityIcon(event.severity)}
              <div className="flex-1 min-w-0">
                <AlertDescription className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{event.event_type}</span>
                    <Badge 
                      variant={getSeverityVariant(event.severity) as any}
                      className="text-xs"
                    >
                      {event.severity || 'info'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}

export default SecurityAlertsMonitor;