import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';

interface TeamMember {
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface CreateCalendarData {
  name: string;
  description?: string;
  color?: string;
  location?: string;
  serviceTypes?: string[];
  teamMembers?: TeamMember[];
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
          user_id: user.id,
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

      // Always add the owner as a calendar member
      try {
        const { error: ownerError } = await supabase
          .from('calendar_members')
          .insert({
            calendar_id: calendar.id,
            user_id: user.id,
            role: 'owner',
            accepted_at: new Date().toISOString()
          });

        if (ownerError) {
          console.error('Error adding owner as calendar member:', ownerError);
        }
      } catch (error) {
        console.error('Error adding owner as calendar member:', error);
      }

      // Link selected service types to the calendar via junction table
      if (data.serviceTypes && data.serviceTypes.length > 0) {
        try {
          const serviceTypeLinks = data.serviceTypes.map(serviceTypeId => ({
            calendar_id: calendar.id,
            service_type_id: serviceTypeId
          }));

          const { error: serviceTypeError } = await supabase
            .from('calendar_service_types')
            .insert(serviceTypeLinks);

          if (serviceTypeError) {
            console.error('Error linking service types to calendar:', serviceTypeError);
            toast({
              title: "Partial Success",
              description: "Calendar created but some service types couldn't be linked",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error linking service types:', error);
        }
      }

      // Add additional team members to the calendar
      if (data.teamMembers && data.teamMembers.length > 0) {
        for (const member of data.teamMembers) {
          try {
            // Skip owner since we already added them above
            if (member.role === 'owner') {
              continue;
            }
            
            // For other members, check if user exists
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email')
              .eq('email', member.email)
              .single();

            if (userData && !userError) {
              // Add member to calendar
              const { error: inviteError } = await supabase
                .from('calendar_members')
                .insert({
                  calendar_id: calendar.id,
                  user_id: userData.id,
                  role: member.role,
                  invited_by: user.id,
                  invited_at: new Date().toISOString()
                });

              if (inviteError) {
                console.error(`Error inviting ${member.email}:`, inviteError);
              }
            } else {
              console.log(`User ${member.email} not found - they would need to be invited when they sign up`);
            }
          } catch (error) {
            console.error(`Error processing team member ${member.email}:`, error);
          }
        }
      }

      toast({
        title: "Kalender aangemaakt",
        description: `${data.name} is succesvol aangemaakt`,
      });

      // Wait for calendar refresh before proceeding
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