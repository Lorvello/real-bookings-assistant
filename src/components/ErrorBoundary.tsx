
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ProductionErrorHandler } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Use centralized error handler with high severity
    ProductionErrorHandler.logError(error, {
      component: 'ErrorBoundary',
      action: 'component_crash',
      url: window.location.href,
      metadata: {
        componentStack: errorInfo.componentStack
      }
    }, 'high');
  }


  private handleRetry = () => {
    this.setState(prev => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prev.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Er is iets misgegaan</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Er is een onverwachte fout opgetreden. Probeer de pagina te vernieuwen of neem contact op met ondersteuning als het probleem aanhoudt.
              </p>
              {this.state.retryCount > 0 && this.state.retryCount < this.maxRetries && (
                <p className="text-sm text-muted-foreground">
                  Pogingen: {this.state.retryCount}/{this.maxRetries}
                </p>
              )}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-gray-50 p-2 rounded">
                  <summary>Error details (development only)</summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button 
                onClick={this.handleRetry} 
                className="w-full"
                disabled={this.state.retryCount >= this.maxRetries}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {this.state.retryCount >= this.maxRetries ? 'Max pogingen bereikt' : 'Opnieuw proberen'}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
