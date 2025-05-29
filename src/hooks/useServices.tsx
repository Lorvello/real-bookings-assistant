
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useServices = (user: User | null) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchServices();
    } else {
      setServices([]);
      setLoading(false);
    }
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;

    try {
      console.log('Fetching services for user:', user.id);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        toast({
          title: "Error",
          description: "Failed to load services",
          variant: "destructive",
        });
        return;
      }

      console.log('Services fetched:', data);
      setServices(data || []);
    } catch (error) {
      console.error('Unexpected error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPopularServices = (appointments: any[]) => {
    if (services.length === 0 || appointments.length === 0) {
      return [];
    }

    // Count appointments by service
    const serviceCounts = appointments.reduce((acc, appointment) => {
      acc[appointment.service_name] = (acc[appointment.service_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalAppointments = appointments.length;

    // Convert to percentage and sort
    return Object.entries(serviceCounts)
      .map(([serviceName, count]) => ({
        name: serviceName,
        percentage: Math.round((count / totalAppointments) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3); // Top 3 services
  };

  return {
    services,
    loading,
    refetch: fetchServices,
    getPopularServices
  };
};
