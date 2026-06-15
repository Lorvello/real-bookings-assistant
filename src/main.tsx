import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize production security
import './utils/productionSecurity'
import { secureLogger } from './utils/secureLogger'
import { ProductionErrorHandler } from './utils/errorHandler'

// Register service worker in production.
// Critical: auto-activate new versions and reload ONCE so users never get
// stuck on a stale cached build (the classic PWA "I still see the old site"
// problem). Without this, an updated service worker waits indefinitely while
// the old one keeps serving cached HTML/JS.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js');

    // Cross-reload one-shot guard (mirrors lazyWithRetry / RouteErrorBoundary).
    // The old in-memory `reloadingForUpdate` flag reset on every page load, so a
    // service worker that kept taking control on each load (e.g. a stale precache
    // serving an index.html with dead chunk hashes) would reload forever and lock
    // the user out. A sessionStorage flag survives the reload and caps us at ONE
    // SW-update reload per session.
    const SW_RELOAD_FLAG = 'swUpdateReloadAttempted';

    // If the page stays alive and stable for a bit, we're on a good build — clear
    // the flag so a genuine future deploy can still get its one allowed reload.
    // In a real loop the page reloads long before this fires, so the flag sticks
    // and breaks the loop.
    window.setTimeout(() => {
      try { sessionStorage.removeItem(SW_RELOAD_FLAG); } catch { /* ignore */ }
    }, 10_000);

    // When a NEW sw takes control, reload once to pull the fresh build. Only on a
    // real update (isUpdate) — never on the first-ever install's clientsClaim —
    // and at most once per session.
    let reloadingForUpdate = false;
    wb.addEventListener('controlling', (event) => {
      if (reloadingForUpdate || !event.isUpdate) return;

      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(SW_RELOAD_FLAG) === '1'; } catch { /* ignore */ }
      if (alreadyReloaded) {
        secureLogger.error('SW took control again after one update reload — not looping');
        return;
      }

      reloadingForUpdate = true;
      try { sessionStorage.setItem(SW_RELOAD_FLAG, '1'); } catch { /* ignore */ }
      window.location.reload();
    });

    // A new SW finished installing but is waiting — tell it to activate now.
    wb.addEventListener('waiting', () => {
      wb.messageSkipWaiting();
    });

    wb.register().catch(err => {
      secureLogger.error('Service Worker registration failed', err);
    });
  });
}

// Enhanced global error handler with ProductionErrorHandler
window.addEventListener('error', (event) => {
  ProductionErrorHandler.logError(event.error, {
    action: 'global_error',
    url: window.location.href,
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  }, 'critical');
  
  // Also log with secureLogger for backwards compatibility
  secureLogger.error('Global error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ProductionErrorHandler.logError(event.reason, {
    action: 'unhandled_rejection',
    url: window.location.href
  }, 'high');
  
  // Also log with secureLogger for backwards compatibility
  secureLogger.error('Unhandled promise rejection', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
