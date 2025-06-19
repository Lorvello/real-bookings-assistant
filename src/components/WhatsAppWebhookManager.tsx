
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { 
  useWhatsAppWebhookQueue, 
  useUnprocessedWebhooks, 
  useProcessWebhookQueue 
} from '@/hooks/useWhatsAppWebhookQueue';
import { useToast } from '@/hooks/use-toast';

export const WhatsAppWebhookManager: React.FC = () => {
  const { data: allWebhooks, isLoading, refetch } = useWhatsAppWebhookQueue();
  const { data: unprocessedWebhooks } = useUnprocessedWebhooks();
  const processQueue = useProcessWebhookQueue();
  const { toast } = useToast();

  const handleProcessQueue = async () => {
    try {
      await processQueue.mutateAsync();
      toast({
        title: "Webhook queue verwerkt",
        description: "Alle webhooks in de queue zijn verwerkt",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Fout bij verwerken queue",
        description: "Er is een fout opgetreden bij het verwerken van de webhook queue",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (webhook: any) => {
    if (webhook.processed) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verwerkt
        </Badge>
      );
    }
    if (webhook.retry_count >= 3) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Gefaald
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        In wachtrij
      </Badge>
    );
  };

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-100 text-blue-800';
      case 'status': return 'bg-yellow-100 text-yellow-800';
      case 'contact_update': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Auto-refresh elke 30 seconden
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return <div>WhatsApp webhook queue laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">WhatsApp Webhook Queue</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleProcessQueue}
            disabled={processQueue.isPending}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processQueue.isPending ? 'animate-spin' : ''}`} />
            Verwerk Queue
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Ververs
          </Button>
        </div>
      </div>

      {/* Status overzicht */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Totaal Webhooks</p>
                <p className="text-2xl font-bold">{allWebhooks?.length || 0}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Wachtrij</p>
                <p className="text-2xl font-bold">{unprocessedWebhooks?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verwerkt</p>
                <p className="text-2xl font-bold">
                  {allWebhooks?.filter(w => w.processed).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook lijst */}
      <Card>
        <CardHeader>
          <CardTitle>Recente Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          {allWebhooks && allWebhooks.length > 0 ? (
            <div className="space-y-3">
              {allWebhooks.slice(0, 20).map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getWebhookTypeColor(webhook.webhook_type)}>
                        {webhook.webhook_type}
                      </Badge>
                      {getStatusBadge(webhook)}
                      {webhook.retry_count > 0 && (
                        <Badge variant="outline">
                          {webhook.retry_count} pogingen
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(webhook.created_at).toLocaleString()}
                      {webhook.processed_at && (
                        <span> • Verwerkt: {new Date(webhook.processed_at).toLocaleString()}</span>
                      )}
                    </p>
                    {webhook.error && (
                      <p className="text-xs text-red-600 mt-1">
                        Fout: {webhook.error}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {webhook.id.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Geen webhooks gevonden. Webhooks verschijnen hier wanneer ze binnenkomen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
