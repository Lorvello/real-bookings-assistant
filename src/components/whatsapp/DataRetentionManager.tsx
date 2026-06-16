
import React from 'react';
import { useWhatsAppRetentionSettings, useWhatsAppDataStats } from '@/hooks/useWhatsAppPrivacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Database, Archive, Trash2 } from 'lucide-react';

interface DataRetentionManagerProps {
  calendarId: string;
}

export function DataRetentionManager({ calendarId }: DataRetentionManagerProps) {
  const { data: retentionSettings } = useWhatsAppRetentionSettings();
  const { data: dataStats, isLoading } = useWhatsAppDataStats(calendarId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMessages = Number(dataStats?.total_messages || 0);
  const oldMessages = Number(dataStats?.old_messages_count || 0);
  const retentionPercentage = totalMessages > 0 ? ((totalMessages - oldMessages) / totalMessages) * 100 : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Bewaring Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Retention Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Berichten Bewaring</span>
              <Badge variant="outline" className="tabular-nums">
                {retentionSettings?.message_retention_days || 90} dagen
              </Badge>
            </div>
            <Progress value={retentionPercentage} className="h-2" />
            <p className="text-xs text-subtle-foreground mt-1 tabular-nums">
              {totalMessages - oldMessages} of {totalMessages} messages within the retention period
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Gearchiveerde Gesprekken</span>
              <Badge variant="secondary" className="tabular-nums">
                {Number(dataStats?.archived_conversations || 0)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-subtle-foreground tabular-nums">
              <Archive className="h-3 w-3" />
              Inactief na {retentionSettings?.conversation_inactive_days || 30} dagen
            </div>
          </div>
        </div>

        {/* Retention Policies */}
        <div>
          <h4 className="font-medium mb-3">Actieve Bewaarbeleid</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <Clock className="h-4 w-4 text-accent-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Automatic Message Deletion</p>
                <p className="text-xs text-subtle-foreground">
                  Messages older than {retentionSettings?.message_retention_days || 90} days are automatically deleted
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 border-transparent">Active</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
              <Archive className="h-4 w-4 text-warning-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Conversation Archiving</p>
                <p className="text-xs text-subtle-foreground">
                  Conversations are archived after {retentionSettings?.conversation_inactive_days || 30} days of inactivity
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 border-transparent">Active</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
              <Trash2 className="h-4 w-4 text-destructive-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Abandoned Booking Intents</p>
                <p className="text-xs text-subtle-foreground">
                  Abandoned booking attempts are deleted after {retentionSettings?.booking_intent_abandoned_days || 7} days
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 border-transparent">Active</Badge>
            </div>
          </div>
        </div>

        {/* Next Cleanup Schedule */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Volgende Automatische Opschoning</p>
              <p className="text-xs text-subtle-foreground">
                Dagelijks om 02:00 (server tijd)
              </p>
            </div>
            <Badge variant="outline">Gepland</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
