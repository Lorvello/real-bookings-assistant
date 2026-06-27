
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Download, 
  Trash2, 
  Clock, 
  Database,
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppPrivacySettingsProps {
  calendarId: string;
}

export function WhatsAppPrivacySettings({ calendarId }: WhatsAppPrivacySettingsProps) {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Get data statistics
  const { data: dataStats, isLoading: statsLoading } = useQuery({
    queryKey: ['whatsapp-data-stats', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  // Cleanup old data mutation
  const cleanupDataMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_whatsapp_data_for_calendar', {
        p_calendar_id: calendarId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('whatsappPrivacySettings.cleanupSuccessTitle', 'Data cleanup completed'),
        description: t('whatsappPrivacySettings.cleanupSuccessDescription', 'Old WhatsApp data has been successfully cleaned up according to your privacy settings.'),
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-data-stats'] });
    },
    onError: (error) => {
      toast({
        title: t('whatsappPrivacySettings.cleanupErrorTitle', 'Data cleanup failed'),
        description: t('whatsappPrivacySettings.cleanupErrorDescription', 'Something went wrong while cleaning up the data. Please try again.'),
        variant: "destructive",
      });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('export_whatsapp_data', {
        p_calendar_id: calendarId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whatsapp-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t('whatsappPrivacySettings.exportSuccessTitle', 'Data export completed'),
        description: t('whatsappPrivacySettings.exportSuccessDescription', 'Your WhatsApp data has been exported and downloaded.'),
      });
    },
    onError: (error) => {
      toast({
        title: t('whatsappPrivacySettings.exportErrorTitle', 'Data export failed'),
        description: t('whatsappPrivacySettings.exportErrorDescription', 'Something went wrong while exporting your data.'),
        variant: "destructive",
      });
    },
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportDataMutation.mutateAsync();
    } finally {
      setIsExporting(false);
    }
  };

  if (statsLoading) {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('whatsappPrivacySettings.cardTitle', 'Privacy & Data Management')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Overview */}
          <div>
            <h3 className="text-lg font-medium mb-4">{t('whatsappPrivacySettings.yourDataHeading', 'Your WhatsApp Data')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.contactsLabel', 'Contacts')}</span>
                  <Badge variant="secondary" className="tabular-nums">{dataStats?.total_contacts || 0}</Badge>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.conversationsLabel', 'Conversations')}</span>
                  <Badge variant="secondary" className="tabular-nums">{dataStats?.total_conversations || 0}</Badge>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.messagesLabel', 'Messages')}</span>
                  <Badge variant="secondary" className="tabular-nums">{dataStats?.total_messages || 0}</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Retention Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">{t('whatsappPrivacySettings.dataRetentionHeading', 'Data Retention')}</h3>
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t('whatsappPrivacySettings.dataRetentionDescription', 'WhatsApp messages are automatically deleted after 90 days. Conversations are archived after 30 days of inactivity.')}
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Privacy Actions */}
          <div>
            <h3 className="text-lg font-medium mb-4">{t('whatsappPrivacySettings.privacyActionsHeading', 'Privacy Actions')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Data */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium">{t('whatsappPrivacySettings.exportDataHeading', 'Export Data')}</h4>
                      <p className="text-sm text-subtle-foreground mb-3">
                        {t('whatsappPrivacySettings.exportDataDescription', 'Download all your WhatsApp data in JSON format')}
                      </p>
                      <Button
                        onClick={handleExportData}
                        disabled={isExporting || exportDataMutation.isPending}
                        size="sm"
                      >
                        {isExporting ? t('whatsappPrivacySettings.exportingButton', 'Exporting...') : t('whatsappPrivacySettings.exportDataButton', 'Export Data')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cleanup Data */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-warning-foreground mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium">{t('whatsappPrivacySettings.cleanupDataHeading', 'Clean Up Old Data')}</h4>
                      <p className="text-sm text-subtle-foreground mb-3">
                        {t('whatsappPrivacySettings.cleanupDataDescription', 'Manually delete old messages and archived conversations')}
                      </p>
                      <Button
                        onClick={() => cleanupDataMutation.mutate()}
                        disabled={cleanupDataMutation.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {cleanupDataMutation.isPending ? t('whatsappPrivacySettings.cleaningUpButton', 'Cleaning up...') : t('whatsappPrivacySettings.cleanupDataButton', 'Clean Up Data')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Privacy Information */}
          <div>
            <h3 className="text-lg font-medium mb-4">{t('whatsappPrivacySettings.privacyInfoHeading', 'Privacy Information')}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t('whatsappPrivacySettings.secureAccessTitle', 'Secure Access')}</p>
                  <p className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.secureAccessDescription', 'Only you have access to your WhatsApp conversations')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t('whatsappPrivacySettings.automaticDeletionTitle', 'Automatic Deletion')}</p>
                  <p className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.automaticDeletionDescription', 'Old messages are automatically deleted according to GDPR guidelines')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{t('whatsappPrivacySettings.dataPortabilityTitle', 'Data Portability')}</p>
                  <p className="text-sm text-subtle-foreground">{t('whatsappPrivacySettings.dataPortabilityDescription', 'You can export your data at any time')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Protection Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('whatsappPrivacySettings.importantLabel', 'Important:')}</strong> {t('whatsappPrivacySettings.gdprNotice', 'This application complies with GDPR requirements. Your WhatsApp data is stored securely and used only to facilitate your bookings. You have the right to view, modify or delete your data.')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
