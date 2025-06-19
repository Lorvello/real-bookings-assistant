
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useErrorHandler } from './useErrorHandler';

interface RetryableQueryOptions<T> extends Omit<UseQueryOptions<T>, 'retry' | 'retryDelay'> {
  maxRetries?: number;
  baseDelay?: number;
}

export const useRetryableQuery = <T,>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: RetryableQueryOptions<T> = {}
) => {
  const { handleError, retryWithBackoff } = useErrorHandler();
  const { maxRetries = 3, baseDelay = 1000, ...queryOptions } = options;

  return useQuery({
    queryKey,
    queryFn: () => retryWithBackoff(queryFn, maxRetries, baseDelay),
    retry: (failureCount, error) => {
      const appError = handleError(error, `Query: ${queryKey.join('/')}`);
      return appError.retryable && failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => Math.min(baseDelay * Math.pow(2, attemptIndex), 30000),
    ...queryOptions
  });
};
