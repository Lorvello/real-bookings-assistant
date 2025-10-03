import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class DataFetchingErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: number[] = [];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Data Fetching Error:', error, errorInfo);
    this.attemptAutoRetry();
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(clearTimeout);
  }

  private attemptAutoRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      const timeoutId = window.setTimeout(() => {
        this.setState(prev => ({ 
          hasError: false, 
          error: undefined,
          retryCount: prev.retryCount + 1 
        }));
        this.props.onRetry?.();
      }, delay);
      
      this.retryTimeouts.push(timeoutId);
    }
  };

  private handleManualRetry = () => {
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message.includes('fetch') || 
                             this.state.error?.message.includes('network');

      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {isNetworkError ? 'Verbindingsprobleem' : 'Data laden mislukt'}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                {isNetworkError 
                  ? 'Controleer je internetverbinding en probeer opnieuw.'
                  : 'Er is een fout opgetreden bij het laden van de gegevens.'}
              </p>
              {this.state.retryCount < this.maxRetries && (
                <p className="text-sm text-muted-foreground">
                  Opnieuw proberen... (poging {this.state.retryCount + 1}/{this.maxRetries})
                </p>
              )}
              <Button onClick={this.handleManualRetry} size="sm" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Handmatig opnieuw proberen
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
