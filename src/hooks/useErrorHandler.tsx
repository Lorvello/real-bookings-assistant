
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ProductionErrorHandler } from '@/utils/errorHandler';

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
            message: 'This data already exists in the system',
            details: error.details,
            retryable: false
          };
        case '23503': // Foreign key violation
          return {
            type: 'validation',
            message: 'Invalid data - linked record not found',
            details: error.details,
            retryable: false
          };
        case '23514': // Check constraint violation
          return {
            type: 'validation',
            message: 'Data does not meet requirements',
            details: error.hint || error.details,
            retryable: false
          };
        case 'P0001': // Custom raised exception
          return {
            type: 'validation',
            message: error.message || 'Validation error',
            details: error.details,
            retryable: false
          };
        default:
          return {
            type: 'server',
            message: 'Server error occurred',
            details: error.message,
            retryable: true
          };
      }
    }

    // Network errors
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Connection problem - please check your internet connection',
        retryable: true
      };
    }

    // Auth errors - comprehensive handling
    if (error?.message?.includes('JWT') || error?.status === 401) {
      return {
        type: 'auth',
        message: 'Your session has expired. Please sign in again.',
        retryable: false
      };
    }

    // Supabase specific auth errors
    if (error?.message?.includes('email_not_confirmed')) {
      return {
        type: 'auth',
        message: 'Please verify your email address before signing in.',
        retryable: false
      };
    }

    if (error?.message?.includes('invalid_credentials')) {
      return {
        type: 'auth',
        message: 'Invalid email or password. Please check your credentials.',
        retryable: false
      };
    }

    if (error?.message?.includes('too_many_requests')) {
      return {
        type: 'auth',
        message: 'Too many attempts. Please wait a moment and try again.',
        retryable: true
      };
    }

    // Custom app errors
    if (error?.type) {
      return error as AppError;
    }

    // Default unknown error
    return {
      type: 'unknown',
      message: error?.message || 'An unknown error occurred',
      retryable: true
    };
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    // Use new centralized handler
    const result = ProductionErrorHandler.handleAPIError(error);
    
    // Show toast
    toast({
      title: "Error",
      description: result.userMessage,
      variant: "destructive",
    });

    // Log with appropriate severity
    const severity = error?.status >= 500 ? 'high' : 'medium';
    ProductionErrorHandler.logError(error, {
      action: context,
      url: window.location.href
    }, severity);

    return parseError(error);
  }, [parseError, toast]);

  const logError = useCallback(async (error: AppError, context?: string) => {
    // Logging is now handled by ProductionErrorHandler
    ProductionErrorHandler.logError(error, {
      action: context,
      url: window.location.href
    }, 'medium');
  }, []);

  const retryWithBackoff = useCallback(async (
    operation: () => Promise<any>,
    maxAttempts: number = 3
  ) => {
    return ProductionErrorHandler.retryWithBackoff(operation, {
      maxAttempts,
      onRetry: (attempt) => {
        toast({
          title: "Retrying...",
          description: `Attempt ${attempt}/${maxAttempts}`,
        });
      }
    });
  }, [toast]);

  return {
    handleError,
    parseError,
    retryWithBackoff,
    logError
  };
};
