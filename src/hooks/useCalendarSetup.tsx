
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCalendarSetup = () => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const [loading, setLoading] = useState(false);

  const setupCalendarDefaults = async (
    calendarId: string,
    businessType?: string
  ): Promise<boolean> => {
    setLoading(true);

    try {
      const { error } = await supabase.rpc('setup_calendar_defaults', {
        p_calendar_id: calendarId,
        p_business_type: businessType
      });

      if (error) {
        console.error('Calendar setup error:', error);
        toast({
          title: t('calendarSetup.setupFailedTitle', 'Setup gefaald'),
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      toast({
        title: t('calendarSetup.configuredTitle', 'Kalender geconfigureerd!'),
        description: t('calendarSetup.configuredDescription', 'Je kalender is ingesteld met standaard configuratie voor jouw business type.'),
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Calendar setup error:', error);
      toast({
        title: t('calendarSetup.setupFailedTitle', 'Setup gefaald'),
        description: t('calendarSetup.unexpectedErrorDescription', 'Er is een onverwachte fout opgetreden'),
        variant: "destructive",
      });
      setLoading(false);
      return false;
    }
  };

  return {
    setupCalendarDefaults,
    loading
  };
};
