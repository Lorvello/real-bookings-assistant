
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Euro, Users, MessageSquare } from 'lucide-react';

interface BusinessIntelligenceTabProps {
  calendarId: string;
}

export function BusinessIntelligenceTab({ calendarId }: BusinessIntelligenceTabProps) {
  const { data: businessIntel, isLoading } = useOptimizedBusinessIntelligence(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading business intelligence...</div>;
  }

  const revenueChange = businessIntel && businessIntel.prev_month_revenue > 0 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Maand Omzet</p>
                <p className="text-2xl font-bold text-blue-900">
                  €{businessIntel?.month_revenue?.toFixed(2) || '0.00'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {isRevenueUp ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${isRevenueUp ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(revenueChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Euro className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Unieke Klanten</p>
                <p className="text-2xl font-bold text-green-900">
                  {businessIntel?.unique_customers_month || 0}
                </p>
                <p className="text-xs text-green-600">deze maand</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Gemiddelde Waarde</p>
                <p className="text-2xl font-bold text-purple-900">
                  €{businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-purple-600">per afspraak</p>
              </div>
              <Euro className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Conversie Rate</p>
                <p className="text-2xl font-bold text-orange-900">
                  {businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-orange-600">WhatsApp → Boeking</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {businessIntel?.service_performance && businessIntel.service_performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessIntel.service_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service_name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'booking_count' ? value : `€${Number(value).toFixed(2)}`,
                    name === 'booking_count' ? 'Boekingen' : 'Omzet'
                  ]}
                />
                <Bar dataKey="booking_count" fill="#3B82F6" name="booking_count" />
                <Bar dataKey="revenue" fill="#10B981" name="revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen service performance data beschikbaar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
