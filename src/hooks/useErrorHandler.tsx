
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AppError {
  type: 'network' | 'validation' | 'auth' | 'server' | 'unknown';
  message: string;
  details?: any;
  retryable?: boolean;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const parseError = useCallback((error: any): AppError => {
    console.error('Error occurred:', error);

    // PostgreSQL/Supabase errors
    if (error?.code) {
      switch (error.code) {
        case '23505': // Unique violation
          return {
            type: 'validation',
            message: 'Deze gegevens bestaan al in het systeem',
            details: error.details,
            retryable: false
          };
        case '23503': // Foreign key violation
          return {
            type: 'validation',
            message: 'Ongeldige gegevens - gekoppelde record niet gevonden',
            details: error.details,
            retryable: false
          };
        case '23514': // Check constraint violation
          return {
            type: 'validation',
            message: 'Gegevens voldoen niet aan de vereisten',
            details: error.hint || error.details,
            retryable: false
          };
        case 'P0001': // Custom raised exception
          return {
            type: 'validation',
            message: error.message || 'Validatie fout',
            details: error.details,
            retryable: false
          };
        default:
          return {
            type: 'server',
            message: 'Server fout opgetreden',
            details: error.message,
            retryable: true
          };
      }
    }

    // Network errors
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Verbindingsprobleem - controleer je internetverbinding',
        retryable: true
      };
    }

    // Auth errors
    if (error?.message?.includes('JWT') || error?.status === 401) {
      return {
        type: 'auth',
        message: 'Sessie verlopen - log opnieuw in',
        retryable: false
      };
    }

    // Custom app errors
    if (error?.type) {
      return error as AppError;
    }

    // Default unknown error
    return {
      type: 'unknown',
      message: error?.message || 'Er is een onbekende fout opgetreden',
      retryable: true
    };
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    const appError = parseError(error);
    
    // Show user-friendly toast
    toast({
      title: "Fout",
      description: appError.message,
      variant: "destructive",
    });

    // Log error for debugging/monitoring
    logError(appError, context);

    return appError;
  }, [parseError, toast]);

  const logError = useCallback(async (error: AppError, context?: string) => {
    try {
      await supabase.rpc('log_error', {
        p_calendar_id: null, // Could be populated based on context
        p_error_type: error.type,
        p_error_message: error.message,
        p_error_context: {
          context,
          details: error.details,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }, []);

  const retryWithBackoff = useCallback(async (
    operation: () => Promise<any>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const appError = parseError(error);
        
        if (!appError.retryable || attempt === maxAttempts) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      }
    }
  }, [parseError]);

  return {
    handleError,
    parseError,
    retryWithBackoff,
    logError
  };
};
