
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { useWebhooks } from '@/hooks/useWebhooks';

interface WebhookManagerProps {
  calendarId: string;
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({ calendarId }) => {
  const { endpoints, events, loading, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint, retryWebhookEvent } = useWebhooks(calendarId);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const handleAddWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    
    await createWebhookEndpoint(newWebhookUrl.trim());
    setNewWebhookUrl('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('confirmed')) return 'bg-green-100 text-green-800';
    if (eventType.includes('cancelled')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div>Loading webhook settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            n8n Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleAddWebhook} className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {endpoints.length > 0 ? (
            <div className="space-y-2">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{endpoint.webhook_url}</p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(endpoint.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={endpoint.is_active}
                      onCheckedChange={(checked) => 
                        updateWebhookEndpoint(endpoint.id, { is_active: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWebhookEndpoint(endpoint.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No webhook endpoints configured. Add one above to start receiving booking notifications in n8n.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                      {event.attempts > 1 && ` • ${event.attempts} attempts`}
                    </p>
                  </div>
                  {event.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryWebhookEvent(event.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No webhook events yet. Events will appear here when bookings are created or updated.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
