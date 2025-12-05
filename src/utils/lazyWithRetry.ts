import { lazy, ComponentType } from 'react';

/**
 * Lazy load with automatic retry on chunk load failure.
 * Useful after deployments when old chunks are no longer available.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn().catch((error) => {
      console.warn('[lazyWithRetry] Chunk load failed, refreshing page...', error);
      // Reload after a small delay to avoid infinite loops
      setTimeout(() => window.location.reload(), 100);
      // Return a placeholder to prevent immediate crash
      return { default: (() => null) as unknown as T };
    })
  );
}
