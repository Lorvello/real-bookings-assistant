import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Component Error (${this.props.componentName}):`, error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="my-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Dit onderdeel kon niet worden geladen</span>
            <Button onClick={this.handleReload} size="sm" variant="outline">
              <RefreshCw className="h-3 w-3 mr-1" />
              Herladen
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
