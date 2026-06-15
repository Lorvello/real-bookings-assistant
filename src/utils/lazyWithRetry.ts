import { lazy, ComponentType } from 'react';

/**
 * Lazy load with a SINGLE automatic retry on chunk-load failure.
 *
 * After a deploy, a stale cached index.html can reference chunk hashes that no
 * longer exist → the import 404s. Reloading once pulls the fresh build. But if a
 * stuck service worker keeps serving the same stale HTML, an UNGUARDED reload
 * loops forever and locks the user out. So we reload AT MOST ONCE (guarded by a
 * sessionStorage flag), then surface the error instead of looping.
 */
const RELOAD_FLAG = 'chunkReloadAttempted';

export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importFn()
      .then((module) => {
        // A chunk loaded successfully → we're on a good build; re-arm the guard
        // so a genuinely new deploy later can still trigger its one allowed reload.
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
        return module;
      })
      .catch((error) => {
        let alreadyReloaded = false;
        try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* ignore */ }

        if (!alreadyReloaded) {
          // First failure this session: reload ONCE to fetch the fresh chunks.
          try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* ignore */ }
          console.warn('[lazyWithRetry] Chunk load failed, reloading once to fetch fresh build…', error);
          window.location.reload();
          // Placeholder so React doesn't crash before the reload takes effect.
          return { default: (() => null) as unknown as T };
        }

        // Already reloaded once and STILL failing → do NOT loop. Throw so the
        // RouteErrorBoundary can show a recoverable "clear cache / hard refresh" UI.
        console.error('[lazyWithRetry] Chunk still failing after one reload — not looping.', error);
        throw error;
      })
  );
}
