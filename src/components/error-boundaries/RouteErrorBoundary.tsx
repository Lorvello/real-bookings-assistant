import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { ProductionErrorHandler } from '@/utils/errorHandler';
import i18n from '@/i18n';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
  /** true once we've already auto-reloaded once for a chunk error this session */
  reloadAttempted: boolean;
}

// Shared one-shot guard key (also used by lazyWithRetry) so a stale cached build
// can trigger AT MOST ONE auto-reload, never an infinite loop that locks the user out.
const RELOAD_FLAG = 'chunkReloadAttempted';

// Detect chunk loading errors (common after deployments)
function isChunkLoadError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('failed to load module script')
  );
}

/**
 * Unregister any service workers + clear all caches, then reload. This is the
 * guaranteed escape from the "stale SW keeps serving an old index.html" trap:
 * a plain reload would just refetch the same broken HTML and loop forever.
 */
async function hardReset(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best-effort — reload regardless */
  } finally {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    window.location.reload();
  }
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false, reloadAttempted: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError = isChunkLoadError(error);
    let reloadAttempted = false;
    try { reloadAttempted = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* ignore */ }
    return { hasError: true, error, isChunkError, reloadAttempted };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunkError = isChunkLoadError(error);

    if (isChunkError) {
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch { /* ignore */ }

      if (!alreadyReloaded) {
        // First chunk error this session: auto-reload ONCE to pull the fresh build.
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* ignore */ }
        console.log('[RouteErrorBoundary] Chunk load error — auto-reloading once…');
        setTimeout(() => window.location.reload(), 800);
      } else {
        // Already reloaded once and STILL broken → stop looping; show the
        // hard-reset UI (clears the stuck service worker + caches) instead.
        console.error('[RouteErrorBoundary] Chunk still failing after one reload — not looping; offering hard reset.');
      }
      return;
    }

    // Route crashes are critical
    ProductionErrorHandler.logError(error, {
      component: 'RouteErrorBoundary',
      action: 'route_crash',
      url: window.location.href,
      metadata: {
        routeName: this.props.routeName,
        componentStack: errorInfo.componentStack,
      },
    }, 'critical');
  }

  private handleHardReset = () => { void hardReset(); };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, isChunkError: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Chunk error: if we've already auto-reloaded once and it's still broken,
      // the service worker is serving a stale build — offer the guaranteed escape.
      if (this.state.isChunkError) {
        const stuck = this.state.reloadAttempted;
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Alert className="max-w-md">
              <RefreshCw className={`h-5 w-5 ${stuck ? '' : 'animate-spin'}`} />
              <AlertTitle className="text-lg">
                {stuck
                  ? i18n.t('routeError.updateFailedTitle', "Couldn't update automatically")
                  : i18n.t('routeError.updatingTitle', 'Updating page…')}
              </AlertTitle>
              <AlertDescription className="space-y-4">
                <p>
                  {stuck
                    ? i18n.t('routeError.stuckBody', 'A cached version is stuck. Click below to clear it and load the latest build.')
                    : i18n.t('routeError.updatingBody', 'A new version is available. The page will refresh automatically.')}
                </p>
                <Button onClick={this.handleHardReset} variant="default" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {stuck
                    ? i18n.t('routeError.clearReload', 'Clear cache & reload')
                    : i18n.t('routeError.refreshNow', 'Refresh now')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Alert className="max-w-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">{i18n.t('routeError.loadFailedTitle', 'Page could not be loaded')}</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                {i18n.t('routeError.loadFailedBody', 'An error occurred while loading this page.')}
                {this.props.routeName && ` (${this.props.routeName})`}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-muted p-2 rounded">
                  <summary>Error details</summary>
                  <pre className="mt-2 whitespace-pre-wrap overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="default" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {i18n.t('routeError.reload', 'Reload')}
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  {i18n.t('routeError.dashboard', 'Dashboard')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
