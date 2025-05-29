
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface BusinessMetrics {
  id: string;
  metric_date: string;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  new_clients: number;
  revenue: number;
  avg_response_time_seconds: number;
  created_at: string;
}

interface AggregatedMetrics {
  totalClients: number;
  newThisWeek: number;
  avgResponse: string;
  successRate: string;
  thisMonth: number;
}

export const useBusinessMetrics = (user: User | null) => {
  const [metrics, setMetrics] = useState<BusinessMetrics[]>([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics>({
    totalClients: 0,
    newThisWeek: 0,
    avgResponse: '0s',
    successRate: '0%',
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchMetrics();
    } else {
      setMetrics([]);
      setLoading(false);
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;

    try {
      console.log('Fetching business metrics for user:', user.id);
      
      const { data, error } = await supabase
        .from('business_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('metric_date', { ascending: false });

      if (error) {
        console.error('Error fetching business metrics:', error);
        toast({
          title: "Error",
          description: "Failed to load business metrics",
          variant: "destructive",
        });
        return;
      }

      console.log('Business metrics fetched:', data);
      setMetrics(data || []);
      calculateAggregatedMetrics(data || []);
    } catch (error) {
      console.error('Unexpected error fetching business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedMetrics = (metricsData: BusinessMetrics[]) => {
    if (metricsData.length === 0) {
      setAggregatedMetrics({
        totalClients: 0,
        newThisWeek: 0,
        avgResponse: '0s',
        successRate: '0%',
        thisMonth: 0,
      });
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate totals
    const totalClients = metricsData.reduce((sum, metric) => sum + metric.new_clients, 0);
    
    // This week's new clients
    const newThisWeek = metricsData
      .filter(metric => new Date(metric.metric_date) >= oneWeekAgo)
      .reduce((sum, metric) => sum + metric.new_clients, 0);

    // This month's appointments
    const thisMonth = metricsData
      .filter(metric => new Date(metric.metric_date) >= startOfMonth)
      .reduce((sum, metric) => sum + metric.total_appointments, 0);

    // Average response time (weighted by appointments)
    const totalAppointments = metricsData.reduce((sum, metric) => sum + metric.total_appointments, 0);
    const weightedResponseTime = metricsData.reduce((sum, metric) => 
      sum + (metric.avg_response_time_seconds * metric.total_appointments), 0);
    const avgResponseSeconds = totalAppointments > 0 ? weightedResponseTime / totalAppointments : 0;
    const avgResponse = avgResponseSeconds < 60 ? `${Math.round(avgResponseSeconds)}s` : `${Math.round(avgResponseSeconds / 60)}m`;

    // Success rate (completed / total)
    const totalCompletedAppointments = metricsData.reduce((sum, metric) => sum + metric.completed_appointments, 0);
    const successRate = totalAppointments > 0 ? Math.round((totalCompletedAppointments / totalAppointments) * 100) : 0;

    setAggregatedMetrics({
      totalClients,
      newThisWeek,
      avgResponse,
      successRate: `${successRate}%`,
      thisMonth,
    });
  };

  return {
    metrics,
    aggregatedMetrics,
    loading,
    refetch: fetchMetrics
  };
};
