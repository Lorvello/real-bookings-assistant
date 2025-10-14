import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, XCircle, AlertCircle } from 'lucide-react';
import { ErrorSeverity } from '@/utils/errorHandler';

interface ErrorAlertProps {
  severity: ErrorSeverity;
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorAlert = ({ 
  severity, 
  title, 
  message, 
  errorCode,
  onRetry,
  onDismiss 
}: ErrorAlertProps) => {
  const severityConfig = {
    low: {
      icon: Info,
      variant: 'default' as const,
      defaultTitle: 'Informatie'
    },
    medium: {
      icon: AlertCircle,
      variant: 'default' as const,
      defaultTitle: 'Waarschuwing'
    },
    high: {
      icon: AlertTriangle,
      variant: 'destructive' as const,
      defaultTitle: 'Fout'
    },
    critical: {
      icon: XCircle,
      variant: 'destructive' as const,
      defaultTitle: 'Kritieke Fout'
    }
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Alert variant={config.variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title || config.defaultTitle}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {errorCode && (
          <p className="text-xs text-muted-foreground">
            Foutcode: {errorCode}
          </p>
        )}
        <div className="flex gap-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Opnieuw proberen
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Sluiten
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
