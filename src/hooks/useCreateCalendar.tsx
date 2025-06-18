
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface CreateCalendarData {
  name: string;
  description?: string;
  color?: string;
}

export const useCreateCalendar = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshCalendars, selectCalendar } = useCalendarContext();

  const createCalendar = async (data: CreateCalendarData) => {
    setLoading(true);

    try {
      // Generate unique slug
      const slug = `cal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const { data: calendar, error } = await supabase
        .from('calendars')
        .insert({
          name: data.name,
          description: data.description,
          color: data.color || '#3B82F6',
          slug: slug,
          is_active: true,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      // Add the user as owner of their calendar
      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendar.id,
          user_id: calendar.user_id,
          role: 'owner',
          accepted_at: new Date().toISOString()
        });

      if (memberError) {
        console.error('Error adding user as calendar member:', memberError);
        // Don't throw here as the calendar was created successfully
      }

      toast({
        title: "Kalender aangemaakt",
        description: `${data.name} is succesvol aangemaakt`,
      });

      // Refresh calendars and select the new one
      refreshCalendars();
      selectCalendar(calendar as any);

      return calendar;
    } catch (error) {
      console.error('Error creating calendar:', error);
      toast({
        title: "Fout bij aanmaken kalender",
        description: "Kon kalender niet aanmaken",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createCalendar,
    loading
  };
};
