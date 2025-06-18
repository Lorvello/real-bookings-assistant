
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics } from '@/hooks/useAnalytics';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Calendar, Clock, TrendingUp, Users, AlertTriangle, Euro } from 'lucide-react';

interface AnalyticsDashboardProps {
  calendarId: string;
}

export function AnalyticsDashboard({ calendarId }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const { analytics, loading } = useAnalytics(calendarId, period);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Geen analytics gegevens beschikbaar</p>
      </div>
    );
  }

  // Prepare heatmap data
  const heatmapData = [];
  const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  for (let hour = 6; hour < 22; hour++) {
    const hourData: any = { hour: `${hour}:00` };
    for (let day = 0; day < 7; day++) {
      const busyTime = analytics.busyTimes.find(bt => bt.day === day && bt.hour === hour);
      hourData[days[day]] = busyTime?.bookings || 0;
    }
    heatmapData.push(hourData);
  }

  // Get max value for heatmap coloring
  const maxBookings = Math.max(...analytics.busyTimes.map(bt => bt.bookings), 1);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Afgelopen week</SelectItem>
            <SelectItem value="month">Afgelopen maand</SelectItem>
            <SelectItem value="quarter">Afgelopen kwartaal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totaal Bookings</p>
                <p className="text-2xl font-bold">{analytics.totalBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totale Omzet</p>
                <p className="text-2xl font-bold">€{analytics.totalRevenue.toFixed(2)}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">No-Show Rate</p>
                <p className="text-2xl font-bold">{analytics.noShowRate.toFixed(1)}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gem. Lead Time</p>
                <p className="text-2xl font-bold">{analytics.averageLeadTime.toFixed(1)} dagen</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="services">Service Types</TabsTrigger>
          <TabsTrigger value="heatmap">Bezettingsgraad</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bookings over tijd</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.bookingsPerPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Bookings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Omzet over tijd</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.bookingsPerPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Omzet']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Omzet (€)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Populaire Service Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.serviceTypeStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.serviceTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Omzet per Service Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.serviceTypeStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Omzet']} />
                    <Bar dataKey="revenue" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Bezettingsgraad per uur/dag</CardTitle>
              <p className="text-sm text-gray-600">
                Hoe druk het is per uur van de dag, per dag van de week
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-8 gap-1 text-xs">
                  <div></div>
                  {days.map(day => (
                    <div key={day} className="text-center font-medium">{day}</div>
                  ))}
                </div>
                {heatmapData.map((hourData) => (
                  <div key={hourData.hour} className="grid grid-cols-8 gap-1">
                    <div className="text-xs font-medium py-1">{hourData.hour}</div>
                    {days.map(day => {
                      const value = hourData[day] || 0;
                      const intensity = value / maxBookings;
                      return (
                        <div
                          key={day}
                          className="aspect-square rounded text-xs flex items-center justify-center text-white font-medium"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.max(0.1, intensity)})`
                          }}
                          title={`${day} ${hourData.hour}: ${value} bookings`}
                        >
                          {value || ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 mt-4">
                <span>Minder druk</span>
                <div className="flex space-x-1">
                  {[0.1, 0.3, 0.5, 0.7, 1].map(intensity => (
                    <div
                      key={intensity}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                    />
                  ))}
                </div>
                <span>Drukker</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
