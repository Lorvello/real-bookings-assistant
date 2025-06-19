
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, TrendingUp, Clock, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface WhatsAppAnalyticsProps {
  calendarId: string;
}

export function WhatsAppAnalytics({ calendarId }: WhatsAppAnalyticsProps) {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['whatsapp-analytics', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  const { data: messageVolume, isLoading: volumeLoading } = useQuery({
    queryKey: ['whatsapp-message-volume', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_message_volume')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('message_date', { ascending: false })
        .order('message_hour', { ascending: true })
        .limit(168); // Last 7 days * 24 hours
      
      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  const { data: conversationTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['whatsapp-conversation-topics', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversation_topics')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('conversation_count', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  // Process message volume data for charts
  const hourlyData = messageVolume?.reduce((acc: any[], item) => {
    const existingHour = acc.find(h => h.hour === item.message_hour);
    if (existingHour) {
      existingHour.messages += item.message_count;
      existingHour.inbound += item.inbound_count;
      existingHour.outbound += item.outbound_count;
    } else {
      acc.push({
        hour: item.message_hour,
        messages: item.message_count,
        inbound: item.inbound_count,
        outbound: item.outbound_count,
      });
    }
    return acc;
  }, []).sort((a, b) => a.hour - b.hour) || [];

  const dailyData = messageVolume?.reduce((acc: any[], item) => {
    const dateStr = item.message_date;
    const existing = acc.find(d => d.date === dateStr);
    if (existing) {
      existing.messages += item.message_count;
      existing.inbound += item.inbound_count;
      existing.outbound += item.outbound_count;
    } else {
      acc.push({
        date: dateStr,
        messages: item.message_count,
        inbound: item.inbound_count,
        outbound: item.outbound_count,
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const topicLabels: Record<string, string> = {
    booking_request: 'Afspraak Verzoeken',
    availability_check: 'Beschikbaarheid Check',
    cancellation: 'Annuleringen',
    information_request: 'Informatie Vragen',
    other: 'Overige'
  };

  if (analyticsLoading || volumeLoading || topicsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Contacten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_contacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.active_conversations || 0} actieve gesprekken
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totaal Berichten</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_messages || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.inbound_messages || 0} inkomend, {analytics?.outbound_messages || 0} uitgaand
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversie Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.conversation_to_booking_rate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.bookings_via_whatsapp || 0} boekingen via WhatsApp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gemiddelde Reactietijd</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avg_response_time_minutes ? 
                `${Math.round(analytics.avg_response_time_minutes)}m` : 
                'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Reactietijd op berichten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Booking Intent Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Booking Intent Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics?.total_booking_intents || 0}
              </div>
              <div className="text-sm text-blue-600">Totaal Booking Intents</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics?.completed_booking_intents || 0}
              </div>
              <div className="text-sm text-green-600">Voltooid</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics?.booking_intent_conversion_rate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-purple-600">Intent Conversie Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume per Hour */}
        <Card>
          <CardHeader>
            <CardTitle>Berichten per Uur (Gemiddeld)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" stackId="a" fill="#10B981" name="Inkomend" />
                <Bar dataKey="outbound" stackId="a" fill="#3B82F6" name="Uitgaand" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversation Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Gesprek Onderwerpen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conversationTopics?.map((topic, index) => ({
                    name: topicLabels[topic.topic_category] || topic.topic_category,
                    value: topic.conversation_count,
                    fill: COLORS[index % COLORS.length]
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Message Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Bericht Volume Trend (Laatste 30 Dagen)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('nl-NL', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('nl-NL')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="messages" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Totaal Berichten"
              />
              <Line 
                type="monotone" 
                dataKey="inbound" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Inkomend"
              />
              <Line 
                type="monotone" 
                dataKey="outbound" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Uitgaand"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Topic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Gedetailleerde Onderwerp Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversationTopics?.map((topic, index) => (
              <div key={topic.topic_category} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <h4 className="font-medium">
                      {topicLabels[topic.topic_category] || topic.topic_category}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {topic.conversation_count} gesprekken
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {((topic.conversation_count / (conversationTopics?.reduce((sum, t) => sum + t.conversation_count, 0) || 1)) * 100).toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
