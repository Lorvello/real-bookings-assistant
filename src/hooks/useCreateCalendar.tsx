
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';

interface CreateCalendarData {
  name: string;
  description?: string;
  color?: string;
}

export const useCreateCalendar = (onSuccess?: (calendar: any) => void) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshCalendars, selectCalendar } = useCalendarContext();
  const { user } = useAuth();

  const createCalendar = async (data: CreateCalendarData) => {
    if (!user) {
      toast({
        title: "Niet ingelogd",
        description: "Je moet ingelogd zijn om een kalender aan te maken",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate unique slug
      const slug = `cal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      console.log('Creating calendar with data:', {
        name: data.name,
        description: data.description,
        color: data.color || '#3B82F6',
        slug: slug,
        user_id: user.id,
        is_active: true,
        is_default: false
      });

      const { data: calendar, error } = await supabase
        .from('calendars')
        .insert({
          name: data.name,
          description: data.description,
          color: data.color || '#3B82F6',
          slug: slug,
          user_id: user.id, // Expliciet user_id meegeven
          is_active: true,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating calendar:', error);
        throw error;
      }

      console.log('Calendar created successfully:', calendar);

      // Add the user as owner of their calendar
      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
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

      // CRITICAL FIX: Wait for calendar refresh before proceeding
      console.log('Waiting for calendar refresh to complete...');
      await refreshCalendars();
      
      // Add small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('Calendar refresh completed, selecting new calendar');
      selectCalendar(calendar as any);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(calendar);
      }

      return calendar;
    } catch (error: any) {
      console.error('Error creating calendar:', error);
      
      let errorMessage = "Kon kalender niet aanmaken";
      
      if (error.code === '42501') {
        errorMessage = "Je hebt geen toestemming om een kalender aan te maken. Probeer opnieuw in te loggen.";
      } else if (error.code === '23505') {
        errorMessage = "Er bestaat al een kalender met deze naam";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Fout bij aanmaken kalender",
        description: errorMessage,
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
