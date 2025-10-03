import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize production security
import './utils/productionSecurity'
import { secureLogger } from './utils/secureLogger'

// Register service worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js');
    wb.register().catch(err => {
      secureLogger.error('Service Worker registration failed', err);
    });
  });
}

// Global error handler
window.addEventListener('error', (event) => {
  secureLogger.error('Global error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  secureLogger.error('Unhandled promise rejection', event.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
