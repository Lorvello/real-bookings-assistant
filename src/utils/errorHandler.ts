// Enhanced error handling utility for production
import { logger } from './logger';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  context?: string;
  component?: string;
}

export class ProductionErrorHandler {
  static handle(error: any, message: string, options: ErrorHandlerOptions = {}) {
    const { context, component } = options;
    
    // Log with appropriate context
    logger.error(message, error, { 
      component,
      action: context,
      data: { timestamp: new Date().toISOString() }
    });

    // Return standardized error for UI
    return {
      type: 'error' as const,
      message: this.getUserFriendlyMessage(error, message),
      originalError: error,
      context
    };
  }

  private static getUserFriendlyMessage(error: any, fallback: string): string {
    // Return user-friendly messages for common errors
    if (error?.message?.includes('Failed to fetch')) {
      return 'Verbindingsprobleem. Controleer je internetverbinding.';
    }
    
    if (error?.code === 'auth/user-not-found') {
      return 'Gebruiker niet gevonden.';
    }
    
    if (error?.code === 'auth/wrong-password') {
      return 'Onjuist wachtwoord.';
    }
    
    if (error?.code === '23505') {
      return 'Deze gegevens bestaan al.';
    }
    
    return fallback || 'Er is een fout opgetreden. Probeer het opnieuw.';
  }
}

// Simplified error handler for quick use
export const handleError = (error: any, message?: string, component?: string) => {
  return ProductionErrorHandler.handle(error, message || 'Unexpected error', { component });
};