
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBusinessIntelligence } from '@/hooks/dashboard/useBusinessIntelligence';
import { Euro, TrendingUp, TrendingDown, Users, Target, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface BusinessIntelligenceTabProps {
  calendarId: string;
}

export function BusinessIntelligenceTab({ calendarId }: BusinessIntelligenceTabProps) {
  const { data: businessIntel, isLoading } = useBusinessIntelligence(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading business intelligence...</div>;
  }

  const revenueChange = businessIntel?.prev_month_revenue 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue) * 100
    : 0;

  const servicePerformance = businessIntel?.service_performance || [];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Maand Omzet</p>
                <p className="text-2xl font-bold text-green-900">
                  €{(businessIntel?.month_revenue || 0).toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {revenueChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : revenueChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : null}
                  <span className={`text-xs ${
                    revenueChange > 0 ? 'text-green-600' : 
                    revenueChange < 0 ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {revenueChange > 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Unieke Klanten</p>
                <p className="text-2xl font-bold text-blue-900">{businessIntel?.unique_customers_month || 0}</p>
                <p className="text-xs text-blue-600">deze maand</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Gem. Waarde</p>
                <p className="text-2xl font-bold text-purple-900">
                  €{(businessIntel?.avg_booking_value || 0).toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">per afspraak</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">WhatsApp Conversie</p>
                <p className="text-2xl font-bold text-orange-900">
                  {(businessIntel?.whatsapp_conversion_rate || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-orange-600">chat → afspraak</p>
              </div>
              <Star className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {servicePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={servicePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="service_name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `€${Number(value).toFixed(2)}` : value,
                      name === 'revenue' ? 'Omzet' : 'Boekingen'
                    ]}
                  />
                  <Bar dataKey="booking_count" fill="#3B82F6" name="Boekingen" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Geen service data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Verdeling</CardTitle>
          </CardHeader>
          <CardContent>
            {servicePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={servicePerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ service_name, booking_count }) => 
                      `${service_name}: ${booking_count}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="booking_count"
                  >
                    {servicePerformance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[index % colors.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Geen service data beschikbaar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Service Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Gedetailleerde Service Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {servicePerformance.map((service, index) => (
              <div key={service.service_name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{service.service_name}</h4>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {service.booking_count} boekingen
                    </span>
                    <span className="font-medium">
                      €{Number(service.revenue).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gemiddelde prijs: €{Number(service.avg_price).toFixed(2)}</span>
                    <span>
                      {((service.booking_count / servicePerformance.reduce((sum, s) => sum + s.booking_count, 0)) * 100).toFixed(1)}% 
                      van totaal
                    </span>
                  </div>
                  <Progress 
                    value={(service.booking_count / Math.max(...servicePerformance.map(s => s.booking_count))) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
