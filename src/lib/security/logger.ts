// Security Event Logging
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  timestamp: string;
  source: string;
}

export interface ThreatDetection {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  metadata: Record<string, any>;
}

export class SecurityLogger {
  private eventQueue: SecurityEvent[] = [];
  private flushTimer: number | null = null;
  private readonly maxQueueSize = 100;
  private readonly flushInterval = 30000; // 30 seconds

  constructor() {
    this.setupAutoFlush();
  }

  async logSecurityEvent(
    eventType: string, 
    metadata: Record<string, any> = {},
    severity: SecurityEvent['severity'] = 'medium'
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        event_type: eventType,
        severity,
        user_id: await this.getCurrentUserId(),
        session_id: await this.getSessionId(),
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        metadata: this.sanitizeMetadata(metadata),
        timestamp: new Date().toISOString(),
        source: 'web_client'
      };

      // Add to queue
      this.eventQueue.push(event);

      // Flush immediately for critical events
      if (severity === 'critical') {
        await this.flushEvents();
      } else if (this.eventQueue.length >= this.maxQueueSize) {
        await this.flushEvents();
      }

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SECURITY] ${eventType}:`, event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async logAuthEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'password_change',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const severity = eventType.includes('failure') ? 'high' : 'medium';
    await this.logSecurityEvent(`auth_${eventType}`, metadata, severity);
  }

  async logDataAccess(
    resource: string,
    action: 'read' | 'write' | 'delete' | 'create',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent('data_access', {
      resource,
      action,
      ...metadata
    });
  }

  async logThreatDetection(threat: ThreatDetection): Promise<void> {
    await this.logSecurityEvent('threat_detected', {
      threat_type: threat.type,
      indicators: threat.indicators,
      ...threat.metadata
    }, threat.severity);
  }

  async logAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const severity = statusCode >= 400 ? 'medium' : 'low';
    await this.logSecurityEvent('api_call', {
      endpoint,
      method,
      status_code: statusCode,
      response_time: responseTime,
      ...metadata
    }, severity);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to Supabase error_logs table
      const { error } = await supabase
        .from('error_logs')
        .insert(
          eventsToFlush.map(event => ({
            error_type: 'security_event',
            error_message: event.event_type,
            error_context: {
              ...event,
              severity: event.severity,
              source: event.source
            },
            user_id: event.user_id || null,
            created_at: event.timestamp
          }))
        );

      if (error) {
        console.error('Failed to flush security events:', error);
        // Re-queue events for retry
        this.eventQueue.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Error flushing security events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  private setupAutoFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }

  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch {
      return undefined;
    }
  }

  private async getSessionId(): Promise<string | undefined> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ? btoa(session.access_token).slice(0, 16) : undefined;
    } catch {
      return undefined;
    }
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      // In a real application, you might get this from a server-side endpoint
      // For now, we'll return undefined as client-side JS can't reliably get real IP
      return undefined;
    } catch {
      return undefined;
    }
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const maxStringLength = 1000;
    const maxDepth = 3;

    const sanitizeValue = (value: any, depth: number): any => {
      if (depth > maxDepth) return '[Object too deep]';
      
      if (typeof value === 'string') {
        return value.length > maxStringLength 
          ? value.substring(0, maxStringLength) + '...[truncated]'
          : value;
      }
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.slice(0, 10).map(item => sanitizeValue(item, depth + 1));
        }
        
        const sanitizedObj: Record<string, any> = {};
        Object.keys(value).slice(0, 20).forEach(key => {
          // Skip sensitive keys
          if (['password', 'token', 'secret', 'key'].some(sensitive => 
            key.toLowerCase().includes(sensitive))) {
            sanitizedObj[key] = '[REDACTED]';
          } else {
            sanitizedObj[key] = sanitizeValue(value[key], depth + 1);
          }
        });
        return sanitizedObj;
      }
      
      return value;
    };

    Object.keys(metadata).forEach(key => {
      sanitized[key] = sanitizeValue(metadata[key], 0);
    });

    return sanitized;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Final flush
    this.flushEvents();
  }
}