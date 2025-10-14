import { supabase } from '@/integrations/supabase/client';

export type SecurityEventCategory = 
  | 'auth' 
  | 'data_access' 
  | 'config_change' 
  | 'payment' 
  | 'webhook' 
  | 'rate_limit' 
  | 'api_key'
  | 'permission_denied';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventDetails {
  eventType: string;
  category: SecurityEventCategory;
  severity: SecuritySeverity;
  userId?: string;
  calendarId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  riskScore?: number;
}

export class SecurityLogger {
  /**
   * Core security event logging method
   */
  static async logSecurityEvent(details: SecurityEventDetails): Promise<void> {
    try {
      const { error } = await supabase.from('security_events_log').insert([{
        event_type: details.eventType,
        event_category: details.category,
        severity: details.severity,
        user_id: details.userId || null,
        calendar_id: details.calendarId || null,
        ip_address: details.ipAddress || null,
        user_agent: details.userAgent || null,
        resource_type: details.resourceType || null,
        resource_id: details.resourceId || null,
        previous_value: details.previousValue || null,
        new_value: details.newValue || null,
        event_data: details.metadata || {},
        risk_score: details.riskScore || 0,
        blocked: details.severity === 'critical'
      }]);

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }

  /**
   * Log authentication attempts (success or failure)
   */
  static async logAuthAttempt(
    success: boolean,
    method: 'email' | 'oauth' | 'magic_link',
    metadata: {
      email?: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      failureReason?: string;
    }
  ): Promise<void> {
    if (!success && metadata.email) {
      // Log to failed_login_attempts table
      await supabase.from('failed_login_attempts').insert([{
        email: metadata.email,
        ip_address: metadata.ipAddress || null,
        failure_reason: metadata.failureReason || 'unknown',
        user_agent: metadata.userAgent || null
      }]);
    }

    await this.logSecurityEvent({
      eventType: success ? 'auth_success' : 'auth_failure',
      category: 'auth',
      severity: success ? 'low' : 'medium',
      userId: metadata.userId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        method,
        email: metadata.email,
        failureReason: metadata.failureReason
      },
      riskScore: success ? 0 : this.calculateAuthRiskScore(metadata)
    });
  }

  /**
   * Log data access events for sensitive resources
   */
  static async logDataAccess(
    resource: string,
    action: 'read' | 'write' | 'delete',
    userId: string,
    metadata?: {
      resourceId?: string;
      calendarId?: string;
      ipAddress?: string;
      queryParams?: Record<string, any>;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: `data_access_${action}`,
      category: 'data_access',
      severity: action === 'delete' ? 'high' : 'low',
      userId,
      calendarId: metadata?.calendarId,
      ipAddress: metadata?.ipAddress,
      resourceType: resource,
      resourceId: metadata?.resourceId,
      metadata: {
        action,
        queryParams: metadata?.queryParams
      }
    });
  }

  /**
   * Log permission denied events (RLS violations)
   */
  static async logPermissionDenied(
    resource: string,
    userId: string,
    reason: string,
    metadata?: {
      action?: string;
      resourceId?: string;
      calendarId?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'permission_denied',
      category: 'permission_denied',
      severity: 'medium',
      userId,
      calendarId: metadata?.calendarId,
      ipAddress: metadata?.ipAddress,
      resourceType: resource,
      resourceId: metadata?.resourceId,
      metadata: {
        reason,
        action: metadata?.action
      },
      riskScore: 25
    });
  }

  /**
   * Log configuration changes
   */
  static async logConfigChange(
    configType: string,
    userId: string,
    previousValue: any,
    newValue: any,
    metadata?: {
      calendarId?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'config_change',
      category: 'config_change',
      severity: 'medium',
      userId,
      calendarId: metadata?.calendarId,
      ipAddress: metadata?.ipAddress,
      resourceType: configType,
      previousValue,
      newValue,
      metadata: {
        changes: this.detectChanges(previousValue, newValue)
      }
    });
  }

  /**
   * Log Stripe payment events with fraud detection
   */
  static async logPaymentEvent(
    eventType: string,
    metadata: {
      amount?: number;
      currency?: string;
      customerId?: string;
      paymentIntentId?: string;
      status?: string;
      fraudScore?: number;
      ipAddress?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: `payment_${eventType}`,
      category: 'payment',
      severity: metadata.fraudScore && metadata.fraudScore > 70 ? 'high' : 'low',
      ipAddress: metadata.ipAddress,
      metadata,
      riskScore: metadata.fraudScore || 0
    });
  }

  /**
   * Log WhatsApp webhook validation failures
   */
  static async logWebhookEvent(
    eventType: string,
    metadata: {
      webhookType?: string;
      validationFailed?: boolean;
      failureReason?: string;
      ipAddress?: string;
      signature?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: `webhook_${eventType}`,
      category: 'webhook',
      severity: metadata.validationFailed ? 'high' : 'low',
      ipAddress: metadata.ipAddress,
      metadata,
      riskScore: metadata.validationFailed ? 50 : 0
    });
  }

  /**
   * Log rate limit violations
   */
  static async logRateLimitViolation(
    endpoint: string,
    ipAddress: string,
    metadata: {
      attempts?: number;
      limit?: number;
      blockDuration?: number;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      category: 'rate_limit',
      severity: 'medium',
      ipAddress,
      metadata: {
        endpoint,
        ...metadata
      },
      riskScore: 30
    });
  }

  /**
   * Log API key usage in edge functions
   */
  static async logApiKeyUsage(
    apiKeyName: string,
    functionName: string,
    metadata: {
      success?: boolean;
      errorMessage?: string;
      ipAddress?: string;
    }
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'api_key_usage',
      category: 'api_key',
      severity: metadata.success ? 'low' : 'medium',
      ipAddress: metadata.ipAddress,
      metadata: {
        apiKeyName,
        functionName,
        success: metadata.success,
        errorMessage: metadata.errorMessage
      },
      riskScore: metadata.success ? 0 : 20
    });
  }

  /**
   * Calculate risk score for authentication attempts
   */
  private static calculateAuthRiskScore(metadata: {
    email?: string;
    ipAddress?: string;
    failureReason?: string;
  }): number {
    let score = 10;

    if (metadata.email?.includes('tempmail') || metadata.email?.includes('10minutemail')) {
      score += 30;
    }

    if (metadata.failureReason === 'account_locked') {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Detect specific changes in configuration objects
   */
  private static detectChanges(oldValue: any, newValue: any): string[] {
    const changes: string[] = [];
    
    if (typeof oldValue !== 'object' || typeof newValue !== 'object') {
      return ['value_changed'];
    }

    for (const key in newValue) {
      if (oldValue[key] !== newValue[key]) {
        changes.push(key);
      }
    }

    return changes;
  }
}
