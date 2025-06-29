
import { useToast } from '@/hooks/use-toast';
import { updateCalendarSettings } from './calendarSettingsUtils';
import { CalendarSettings } from '@/types/database';

export const useCalendarSaveActions = (
  calendarId?: string,
  settings?: CalendarSettings | null,
  pendingChanges?: Partial<CalendarSettings>,
  hasPendingChanges?: boolean,
  setSaving?: (saving: boolean) => void,
  setPendingChanges?: (changes: Partial<CalendarSettings>) => void,
  fetchSettings?: () => void
) => {
  const { toast } = useToast();

  const saveAllChanges = async (): Promise<boolean> => {
    if (!calendarId || !settings || !hasPendingChanges || !pendingChanges) {
      console.log('Cannot save: missing requirements', { 
        calendarId, 
        settings: !!settings, 
        hasPendingChanges 
      });
      return false;
    }

    setSaving?.(true);
    try {
      const success = await updateCalendarSettings(calendarId, pendingChanges);

      if (!success) {
        toast({
          title: "Fout",
          description: "Kan kalender instellingen niet opslaan",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Succes",
        description: "Kalender instellingen succesvol opgeslagen",
      });

      setPendingChanges?.({});
      fetchSettings?.();
      return true;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving?.(false);
    }
  };

  return {
    saveAllChanges
  };
};
