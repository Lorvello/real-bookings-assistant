import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useSecurityValidation = () => {
  const { toast } = useToast();

  // Server-side input validation
  const validateInput = useCallback(async (
    input: string, 
    type: 'email' | 'text' | 'url' | 'phone' | 'slug' = 'text',
    maxLength: number = 1000
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_user_input', {
        p_input: input,
        p_type: type,
        p_max_length: maxLength
      });

      if (error) {
        console.error('Validation error:', error);
        toast({
          title: "Validation Error",
          description: "Input validation failed",
          variant: "destructive"
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Invalid Input",
          description: `${type} format is invalid`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Validation function error:', error);
      return false;
    }
  }, [toast]);

  // Sanitize HTML content
  const sanitizeHtml = useCallback((html: string): string => {
    // Remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }, []);

  // Rate limiting check
  const checkRateLimit = useCallback(async (action: string): Promise<boolean> => {
    const key = `rate_limit_${action}_${Date.now()}`;
    const stored = sessionStorage.getItem(key);
    
    if (stored) {
      const attempts = JSON.parse(stored);
      if (attempts.count >= 5 && Date.now() - attempts.timestamp < 60000) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many attempts. Please wait a minute.",
          variant: "destructive"
        });
        return false;
      }
    }

    const currentAttempts = stored ? JSON.parse(stored) : { count: 0, timestamp: Date.now() };
    currentAttempts.count += 1;
    currentAttempts.timestamp = Date.now();
    
    sessionStorage.setItem(key, JSON.stringify(currentAttempts));
    return true;
  }, [toast]);

  // Audit security event
  const auditSecurityEvent = useCallback(async (
    eventType: string,
    details: Record<string, any> = {}
  ) => {
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_event_type: eventType,
        p_event_details: details,
        p_ip_address: null, // Would need server-side implementation
        p_user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  return {
    validateInput,
    sanitizeHtml,
    checkRateLimit,
    auditSecurityEvent
  };
};