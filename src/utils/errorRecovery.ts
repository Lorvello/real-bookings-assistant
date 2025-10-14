/**
 * Error recovery utilities for graceful degradation
 */
import { ProductionErrorHandler } from './errorHandler';

/**
 * Execute operation with fallback value on error
 */
export const withFallback = <T>(
  operation: () => T,
  fallbackValue: T,
  options?: { logError?: boolean }
): T => {
  try {
    return operation();
  } catch (error) {
    if (options?.logError) {
      ProductionErrorHandler.logError(error, {
        action: 'fallback_used'
      }, 'low');
    }
    return fallbackValue;
  }
};

/**
 * Execute async operation with fallback value on error
 */
export const withAsyncFallback = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  options?: { retry?: boolean; logError?: boolean }
): Promise<T> => {
  try {
    if (options?.retry) {
      return await ProductionErrorHandler.retryWithBackoff(operation);
    }
    return await operation();
  } catch (error) {
    if (options?.logError) {
      ProductionErrorHandler.logError(error, {
        action: 'async_fallback_used'
      }, 'low');
    }
    return fallbackValue;
  }
};

/**
 * Graceful degradation for UI components
 */
export const withGracefulDegradation = <T>(
  preferredOperation: () => T,
  fallbackOperation: () => T,
  context: string
): T => {
  try {
    return preferredOperation();
  } catch (error) {
    ProductionErrorHandler.logError(error, {
      action: 'graceful_degradation',
      component: context
    }, 'low');
    return fallbackOperation();
  }
};
