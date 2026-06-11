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

    // When a new SW takes control, reload once to pull the fresh build.
    let reloadingForUpdate = false;
    wb.addEventListener('controlling', () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
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
