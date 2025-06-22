
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
    return (
      <div className="space-y-8">
        {/* Loading skeleton met futuristic design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-lg"></div>
              <div className="relative bg-card/50 backdrop-blur-xl rounded-2xl p-6 border border-border/50 animate-pulse">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded-lg w-1/2"></div>
                  <div className="h-8 bg-muted rounded-lg w-3/4"></div>
                  <div className="h-3 bg-muted rounded-lg w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const revenueChange = businessIntel && businessIntel.prev_month_revenue > 0 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  return (
    <div className="space-y-8">
      {/* Key Metrics met futuristic cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Maand Omzet */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
          <Card className="relative bg-card/80 backdrop-blur-xl border-blue-200/50 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-700 tracking-wide">MAAND OMZET</p>
                  <p className="text-3xl font-bold text-blue-900 tabular-nums">
                    €{businessIntel?.month_revenue?.toFixed(2) || '0.00'}
                  </p>
                  <div className="flex items-center gap-2">
                    {isRevenueUp ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-semibold ${isRevenueUp ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(revenueChange).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Euro className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unieke Klanten */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
          <Card className="relative bg-card/80 backdrop-blur-xl border-green-200/50 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-green-700 tracking-wide">UNIEKE KLANTEN</p>
                  <p className="text-3xl font-bold text-green-900 tabular-nums">
                    {businessIntel?.unique_customers_month || 0}
                  </p>
                  <p className="text-sm text-green-600 font-medium">deze maand</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Users className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gemiddelde Waarde */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
          <Card className="relative bg-card/80 backdrop-blur-xl border-purple-200/50 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-purple-700 tracking-wide">GEMIDDELDE WAARDE</p>
                  <p className="text-3xl font-bold text-purple-900 tabular-nums">
                    €{businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-purple-600 font-medium">per afspraak</p>
                </div>
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Euro className="h-7 w-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversie Rate */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-600/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
          <Card className="relative bg-card/80 backdrop-blur-xl border-orange-200/50 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-orange-700 tracking-wide">CONVERSIE RATE</p>
                  <p className="text-3xl font-bold text-orange-900 tabular-nums">
                    {businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-sm text-orange-600 font-medium">WhatsApp → Boeking</p>
                </div>
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service Performance Chart met futuristic design */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl blur-2xl"></div>
        <Card className="relative bg-card/80 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          <CardHeader className="relative pb-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Service Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {businessIntel?.service_performance && businessIntel.service_performance.length > 0 ? (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={businessIntel.service_performance} barGap={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
                    <XAxis 
                      dataKey="service_name" 
                      tick={{ fill: 'rgb(100 116 139)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgb(148 163 184 / 0.3)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'rgb(100 116 139)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgb(148 163 184 / 0.3)' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'booking_count' ? value : `€${Number(value).toFixed(2)}`,
                        name === 'booking_count' ? 'Boekingen' : 'Omzet'
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgb(148 163 184 / 0.3)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <Bar 
                      dataKey="booking_count" 
                      fill="url(#blueGradient)" 
                      name="booking_count" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="url(#greenGradient)" 
                      name="revenue" 
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1E40AF" />
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BarChart className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nog geen data beschikbaar</h3>
                <p className="text-muted-foreground">Service performance data wordt geladen zodra er boekingen zijn</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
