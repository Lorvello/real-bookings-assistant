import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { ProductionErrorHandler } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  isChunkError: boolean;
}

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

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isChunkError = isChunkLoadError(error);
    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunkError = isChunkLoadError(error);
    
    // For chunk errors, auto-refresh after a short delay
    if (isChunkError) {
      console.log('[RouteErrorBoundary] Chunk load error detected, auto-refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }

    // Route crashes are critical
    ProductionErrorHandler.logError(error, {
      component: 'RouteErrorBoundary',
      action: 'route_crash',
      url: window.location.href,
      metadata: {
        routeName: this.props.routeName,
        componentStack: errorInfo.componentStack
      }
    }, 'critical');
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, isChunkError: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Show a simpler message for chunk errors since we auto-refresh
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Alert className="max-w-md">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <AlertTitle className="text-lg">Pagina wordt bijgewerkt...</AlertTitle>
              <AlertDescription className="space-y-4">
                <p>
                  Er is een nieuwe versie beschikbaar. De pagina wordt automatisch ververst.
                </p>
                <Button onClick={this.handleRetry} variant="default" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Nu verversen
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
            <AlertTitle className="text-lg">Pagina kon niet worden geladen</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Er is een fout opgetreden bij het laden van deze pagina.
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
                  Opnieuw laden
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
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
