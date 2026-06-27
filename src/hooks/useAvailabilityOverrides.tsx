
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvailabilityOverride } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAvailabilityOverrides = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchOverrides();
    } else {
      setOverrides([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchOverrides = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching availability overrides:', error);
        return;
      }

      setOverrides(data || []);
    } catch (error) {
      console.error('Error fetching availability overrides:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOverride = async (overrideData: Partial<AvailabilityOverride>) => {
    if (!calendarId) return;

    // Ensure required fields are present
    if (!overrideData.date) {
      toast({
        title: t('availabilityOverrides.dateRequired.title', 'Error'),
        description: t('availabilityOverrides.dateRequired.description', 'Date is required'),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('availability_overrides')
        .insert({
          calendar_id: calendarId,
          date: overrideData.date,
          is_available: overrideData.is_available ?? false,
          start_time: overrideData.start_time,
          end_time: overrideData.end_time,
          reason: overrideData.reason
        });

      if (error) {
        toast({
          title: t('availabilityOverrides.createError.title', 'Error'),
          description: t('availabilityOverrides.createError.description', 'Failed to create availability override'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('availabilityOverrides.createSuccess.title', 'Success'),
        description: t('availabilityOverrides.createSuccess.description', 'Availability override created successfully'),
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error creating availability override:', error);
      toast({
        title: t('availabilityOverrides.createUnexpectedError.title', 'Error'),
        description: t('availabilityOverrides.createUnexpectedError.description', 'An unexpected error occurred'),
        variant: "destructive",
      });
    }
  };

  const updateOverride = async (id: string, updates: Partial<AvailabilityOverride>) => {
    try {
      const { error } = await supabase
        .from('availability_overrides')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: t('availabilityOverrides.updateError.title', 'Error'),
          description: t('availabilityOverrides.updateError.description', 'Failed to update availability override'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('availabilityOverrides.updateSuccess.title', 'Success'),
        description: t('availabilityOverrides.updateSuccess.description', 'Availability override updated successfully'),
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error updating availability override:', error);
      toast({
        title: t('availabilityOverrides.updateUnexpectedError.title', 'Error'),
        description: t('availabilityOverrides.updateUnexpectedError.description', 'An unexpected error occurred'),
        variant: "destructive",
      });
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availability_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: t('availabilityOverrides.deleteError.title', 'Error'),
          description: t('availabilityOverrides.deleteError.description', 'Failed to delete availability override'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('availabilityOverrides.deleteSuccess.title', 'Success'),
        description: t('availabilityOverrides.deleteSuccess.description', 'Availability override deleted successfully'),
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error deleting availability override:', error);
      toast({
        title: t('availabilityOverrides.deleteUnexpectedError.title', 'Error'),
        description: t('availabilityOverrides.deleteUnexpectedError.description', 'An unexpected error occurred'),
        variant: "destructive",
      });
    }
  };

  return {
    overrides,
    loading,
    createOverride,
    updateOverride,
    deleteOverride,
    refetch: fetchOverrides
  };
};
