import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueData {
  totalRevenue: number;
  totalTax: number;
  currency: string;
  serviceBreakdown: {
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
    taxCollected: number;
    price: number;
    taxRate: number;
  }[];
  monthlyTrends: {
    month: string;
    revenue: number;
    taxCollected: number;
    bookings: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendar_id, period = 'current_month' } = await req.json();
    
    if (!calendar_id) {
      throw new Error('Calendar ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get date range based on period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let startDate: string;
    let endDate: string;
    
    if (period === 'current_month') {
      startDate = new Date(currentYear, currentMonth, 1).toISOString();
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
    } else {
      // Last 12 months for trends
      startDate = new Date(currentYear - 1, currentMonth, 1).toISOString();
      endDate = new Date().toISOString();
    }

    // Get completed bookings with service type info
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        total_price,
        start_time,
        service_type_id,
        payment_currency,
        service_types (
          id,
          name,
          price,
          tax_enabled,
          applicable_tax_rate,
          business_country
        )
      `)
      .eq('calendar_id', calendar_id)
      .eq('status', 'confirmed')
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .not('service_types', 'is', null);

    if (bookingsError) throw bookingsError;

    // Calculate revenue and tax by service
    const serviceMap = new Map();
    let totalRevenue = 0;
    let totalTax = 0;
    const currency = bookings?.[0]?.payment_currency || 'eur';

    bookings?.forEach(booking => {
      const service = booking.service_types;
      if (!service) return;

      const revenue = Number(booking.total_price) || 0;
      const taxRate = service.tax_enabled ? (Number(service.applicable_tax_rate) || 0) / 100 : 0;
      const taxCollected = revenue * taxRate / (1 + taxRate); // Tax from inclusive price

      totalRevenue += revenue;
      totalTax += taxCollected;

      const serviceKey = service.id;
      if (!serviceMap.has(serviceKey)) {
        serviceMap.set(serviceKey, {
          serviceId: service.id,
          serviceName: service.name,
          bookingCount: 0,
          revenue: 0,
          taxCollected: 0,
          price: Number(service.price) || 0,
          taxRate: taxRate * 100
        });
      }

      const serviceData = serviceMap.get(serviceKey);
      serviceData.bookingCount += 1;
      serviceData.revenue += revenue;
      serviceData.taxCollected += taxCollected;
    });

    // Generate monthly trends for last 6 months
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(currentYear, currentMonth - i, 1);
      const monthStart = new Date(trendMonth.getFullYear(), trendMonth.getMonth(), 1).toISOString();
      const monthEnd = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: monthBookings } = await supabase
        .from('bookings')
        .select('total_price, service_types(tax_enabled, applicable_tax_rate)')
        .eq('calendar_id', calendar_id)
        .eq('status', 'confirmed')
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd);

      let monthRevenue = 0;
      let monthTax = 0;
      monthBookings?.forEach(booking => {
        const revenue = Number(booking.total_price) || 0;
        const service = booking.service_types;
        const taxRate = service?.tax_enabled ? (Number(service.applicable_tax_rate) || 0) / 100 : 0;
        const tax = revenue * taxRate / (1 + taxRate);
        
        monthRevenue += revenue;
        monthTax += tax;
      });

      monthlyTrends.push({
        month: trendMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        taxCollected: monthTax,
        bookings: monthBookings?.length || 0
      });
    }

    const response: RevenueData = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      currency: currency.toUpperCase(),
      serviceBreakdown: Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue),
      monthlyTrends
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to calculate revenue analytics',
        totalRevenue: 0,
        totalTax: 0,
        currency: 'EUR',
        serviceBreakdown: [],
        monthlyTrends: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});