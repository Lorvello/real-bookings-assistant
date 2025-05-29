
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_name: string;
  service_duration: number;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
}

export const useAppointments = (user: User | null) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAppointments();
    } else {
      setAppointments([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;

    try {
      console.log('Fetching appointments for user:', user.id);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: "Failed to load appointments",
          variant: "destructive",
        });
        return;
      }

      console.log('Appointments fetched:', data);
      setAppointments(data || []);
    } catch (error) {
      console.error('Unexpected error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === today);
  };

  const getAppointmentsByDateRange = (startDate: string, endDate: string) => {
    return appointments.filter(apt => 
      apt.appointment_date >= startDate && apt.appointment_date <= endDate
    );
  };

  return {
    appointments,
    loading,
    refetch: fetchAppointments,
    getTodaysAppointments,
    getAppointmentsByDateRange
  };
};
