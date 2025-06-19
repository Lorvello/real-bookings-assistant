
import React, { useState } from 'react';
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
        title: "Data Opschoning Voltooid",
        description: "Oude WhatsApp data is succesvol opgeschoond volgens uw privacy instellingen.",
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-data-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Fout bij Data Opschoning",
        description: "Er is een fout opgetreden bij het opschonen van de data. Probeer het opnieuw.",
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
        title: "Data Export Voltooid",
        description: "Uw WhatsApp data is geëxporteerd en gedownload.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij Data Export",
        description: "Er is een fout opgetreden bij het exporteren van uw data.",
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
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            Privacy & Data Beheer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Overview */}
          <div>
            <h3 className="text-lg font-medium mb-4">Uw WhatsApp Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contacten</span>
                  <Badge variant="secondary">{dataStats?.total_contacts || 0}</Badge>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Gesprekken</span>
                  <Badge variant="secondary">{dataStats?.total_conversations || 0}</Badge>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Berichten</span>
                  <Badge variant="secondary">{dataStats?.total_messages || 0}</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Retention Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Data Bewaring</h3>
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                WhatsApp berichten worden automatisch verwijderd na 90 dagen. 
                Gesprekken worden gearchiveerd na 30 dagen inactiviteit.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Privacy Actions */}
          <div>
            <h3 className="text-lg font-medium mb-4">Privacy Acties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Data */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium">Data Exporteren</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Download al uw WhatsApp data in JSON formaat
                      </p>
                      <Button 
                        onClick={handleExportData}
                        disabled={isExporting || exportDataMutation.isPending}
                        size="sm"
                      >
                        {isExporting ? 'Exporteren...' : 'Export Data'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cleanup Data */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium">Oude Data Opschonen</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Verwijder handmatig oude berichten en gearchiveerde gesprekken
                      </p>
                      <Button 
                        onClick={() => cleanupDataMutation.mutate()}
                        disabled={cleanupDataMutation.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {cleanupDataMutation.isPending ? 'Opschonen...' : 'Data Opschonen'}
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
            <h3 className="text-lg font-medium mb-4">Privacy Informatie</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Veilige Toegang</p>
                  <p className="text-sm text-gray-600">Alleen u heeft toegang tot uw WhatsApp conversaties</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Automatische Verwijdering</p>
                  <p className="text-sm text-gray-600">Oude berichten worden automatisch verwijderd volgens GDPR richtlijnen</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Data Portabiliteit</p>
                  <p className="text-sm text-gray-600">U kunt uw data op elk moment exporteren</p>
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
          <strong>Belangrijk:</strong> Deze applicatie voldoet aan GDPR-vereisten. 
          Uw WhatsApp data wordt veilig opgeslagen en alleen gebruikt voor het faciliteren van uw boekingen. 
          U heeft het recht om uw data in te zien, te wijzigen of te verwijderen.
        </AlertDescription>
      </Alert>
    </div>
  );
}
