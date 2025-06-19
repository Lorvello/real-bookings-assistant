
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useWebhookStatus } from '@/hooks/useWebhookStatus';

interface WebhookStatusIndicatorProps {
  calendarId: string;
}

export const WebhookStatusIndicator: React.FC<WebhookStatusIndicatorProps> = ({
  calendarId
}) => {
  const { failedEvents, pendingEvents, retryFailedWebhooks, hasFailures, loading } = useWebhookStatus(calendarId);

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Webhook status laden...
      </Badge>
    );
  }

  if (hasFailures) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {failedEvents.length} webhook(s) gefaald
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={retryFailedWebhooks}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Opnieuw proberen
        </Button>
      </div>
    );
  }

  if (pendingEvents.length > 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {pendingEvents.length} webhook(s) in behandeling
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-200">
      <CheckCircle className="h-3 w-3" />
      Webhooks OK
    </Badge>
  );
};
