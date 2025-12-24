import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarLimits } from '@/hooks/useSubscriptionLimits';
import { useAccessControl } from '@/hooks/useAccessControl';

interface TeamMember {
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

interface PendingServiceType {
  id: string;
  name: string;
  duration: number;
  price?: number;
  color: string;
  description?: string;
  isPending: true;
}

interface DayAvailability {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface CreateCalendarData {
  name: string;
  description?: string;
  color?: string;
  location?: string;
  serviceTypes?: string[];
  pendingServiceTypes?: PendingServiceType[];
  teamMembers?: TeamMember[];
  availability?: Record<string, DayAvailability>;
}

export const useCreateCalendar = (onSuccess?: (calendar: any) => void) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshCalendars, selectCalendar } = useCalendarContext();
  const { user } = useAuth();
  const { canCreateMore, currentCount, maxCalendars } = useCalendarLimits();
  const { checkAccess } = useAccessControl();

  const createCalendar = async (data: CreateCalendarData) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to create a calendar",
        variant: "destructive",
      });
      return;
    }

    // Check subscription access for creating bookings/calendars
    if (!checkAccess('canCreateBookings')) {
      toast({
        title: "Calendar Creation Restricted",
        description: "Reactivate your account to create new calendars",
        variant: "destructive",
      });
      return;
    }

    // Check calendar limit
    if (!canCreateMore) {
      toast({
        title: "Calendar Limit Reached",
        description: `You can only create ${maxCalendars} calendar${maxCalendars === 1 ? '' : 's'} on your current plan. Please upgrade to create more calendars.`,
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

      // Create pending service types with the new calendar_id
      if (data.pendingServiceTypes && data.pendingServiceTypes.length > 0) {
        console.log('Creating pending service types for new calendar:', data.pendingServiceTypes);
        
        for (const pendingService of data.pendingServiceTypes) {
          try {
            const { data: newService, error: serviceError } = await supabase
              .from('service_types')
              .insert({
                calendar_id: calendar.id,
                name: pendingService.name,
                duration: pendingService.duration,
                price: pendingService.price || null,
                color: pendingService.color,
                description: pendingService.description || null,
                is_active: true,
                max_attendees: 1,
                preparation_time: 0,
                cleanup_time: 0
              })
              .select()
              .single();

            if (serviceError) {
              console.error('Error creating pending service type:', serviceError);
            } else {
              console.log('Created service type:', newService);
              
              // If service has a price, create Stripe price via edge function
              if (pendingService.price && pendingService.price > 0) {
                try {
                  const { error: stripeError } = await supabase.functions.invoke('create-service-type-with-stripe', {
                    body: {
                      serviceTypeId: newService.id,
                      name: pendingService.name,
                      price: pendingService.price,
                      currency: 'eur',
                      calendarId: calendar.id
                    }
                  });
                  
                  if (stripeError) {
                    console.error('Error creating Stripe price for service:', stripeError);
                  }
                } catch (stripeError) {
                  console.error('Error invoking Stripe function:', stripeError);
                }
              }
            }
          } catch (error) {
            console.error('Error processing pending service type:', error);
          }
        }
      }

      // Link selected existing service types to the calendar
      if (data.serviceTypes && data.serviceTypes.length > 0) {
        try {
          for (const serviceTypeId of data.serviceTypes) {
            // Check if this is a global service type (calendar_id is null)
            const { data: serviceTypeData, error: fetchError } = await supabase
              .from('service_types')
              .select('calendar_id')
              .eq('id', serviceTypeId)
              .single();

            if (fetchError) {
              console.error('Error fetching service type:', fetchError);
              continue;
            }

            if (serviceTypeData.calendar_id === null) {
              // This is a global service type, update it to be calendar-specific
              const { error: updateError } = await supabase
                .from('service_types')
                .update({ calendar_id: calendar.id })
                .eq('id', serviceTypeId);

              if (updateError) {
                console.error('Error updating global service type:', updateError);
              }
            } else {
              // This is an existing calendar-specific service type, link via junction table
              const { error: linkError } = await supabase
                .from('calendar_service_types')
                .insert({
                  calendar_id: calendar.id,
                  service_type_id: serviceTypeId
                });

              if (linkError) {
                console.error('Error linking service type:', linkError);
              }
            }
          }
        } catch (error) {
          console.error('Error processing service types:', error);
          toast({
            title: "Partial Success",
            description: "Calendar created but some service types couldn't be linked",
            variant: "destructive",
          });
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

      // Update availability rules if custom availability was provided
      if (data.availability) {
        try {
          // Wait a bit for the database trigger to create the default schedule
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Get the schedule that was auto-created by the database trigger
          const { data: scheduleData, error: scheduleError } = await supabase
            .from('availability_schedules')
            .select('id')
            .eq('calendar_id', calendar.id)
            .eq('is_default', true)
            .single();
          
          if (scheduleData && !scheduleError) {
            // Day key to day_of_week mapping
            const dayMapping: Record<string, number> = {
              sunday: 0,
              monday: 1,
              tuesday: 2,
              wednesday: 3,
              thursday: 4,
              friday: 5,
              saturday: 6
            };
            
            // Update each day's availability
            for (const [dayKey, dayData] of Object.entries(data.availability)) {
              const dayOfWeek = dayMapping[dayKey];
              if (dayOfWeek === undefined) continue;
              
              // Update the existing rule created by the trigger
              const { error: updateError } = await supabase
                .from('availability_rules')
                .update({
                  start_time: dayData.startTime,
                  end_time: dayData.endTime,
                  is_available: dayData.enabled
                })
                .eq('schedule_id', scheduleData.id)
                .eq('day_of_week', dayOfWeek);
              
              if (updateError) {
                console.error(`Error updating availability for ${dayKey}:`, updateError);
              }
            }
            
            console.log('Custom availability rules applied successfully');
          }
        } catch (error) {
          console.error('Error updating availability rules:', error);
        }
      }

      toast({
        title: "Calendar created",
        description: `${data.name} was successfully created`,
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
      
      let errorMessage = "Could not create calendar";
      
      if (error.code === '42501') {
        errorMessage = "You don't have permission to create a calendar. Try logging in again.";
      } else if (error.code === '23505') {
        errorMessage = "A calendar with this name already exists";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error creating calendar",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Override canCreateMore based on subscription access
  const hasSubscriptionAccess = checkAccess('canCreateBookings');
  const effectiveCanCreateMore = hasSubscriptionAccess && canCreateMore;

  return {
    createCalendar,
    loading,
    canCreateMore: effectiveCanCreateMore,
    currentCount,
    maxCalendars
  };
};
