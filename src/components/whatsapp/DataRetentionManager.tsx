
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
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMessages = dataStats?.total_messages || 0;
  const oldMessages = dataStats?.old_messages_count || 0;
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
              <Badge variant="outline">
                {retentionSettings?.message_retention_days || 90} dagen
              </Badge>
            </div>
            <Progress value={retentionPercentage} className="h-2" />
            <p className="text-xs text-gray-600 mt-1">
              {totalMessages - oldMessages} van {totalMessages} berichten binnen bewaartermijn
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Gearchiveerde Gesprekken</span>
              <Badge variant="secondary">
                {dataStats?.archived_conversations || 0}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Archive className="h-3 w-3" />
              Inactief na {retentionSettings?.conversation_inactive_days || 30} dagen
            </div>
          </div>
        </div>

        {/* Retention Policies */}
        <div>
          <h4 className="font-medium mb-3">Actieve Bewaarbeleid</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Automatische Berichten Verwijdering</p>
                <p className="text-xs text-gray-600">
                  Berichten ouder dan {retentionSettings?.message_retention_days || 90} dagen worden automatisch verwijderd
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Actief</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Archive className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Gesprek Archivering</p>
                <p className="text-xs text-gray-600">
                  Gesprekken worden gearchiveerd na {retentionSettings?.conversation_inactive_days || 30} dagen inactiviteit
                </p>
              </div>
              <Badge className="bg-orange-100 text-orange-800">Actief</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <Trash2 className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Verlaten Booking Intents</p>
                <p className="text-xs text-gray-600">
                  Verlaten booking pogingen worden na {retentionSettings?.booking_intent_abandoned_days || 7} dagen verwijderd
                </p>
              </div>
              <Badge className="bg-red-100 text-red-800">Actief</Badge>
            </div>
          </div>
        </div>

        {/* Next Cleanup Schedule */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Volgende Automatische Opschoning</p>
              <p className="text-xs text-gray-600">
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
