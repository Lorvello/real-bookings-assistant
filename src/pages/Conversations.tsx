
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare, Clock, User as UserIcon, CalendarIcon, Filter, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Conversations = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [timeFilter, setTimeFilter] = useState('week');
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'custom':
        if (customDate) {
          return { start: startOfDay(customDate), end: endOfDay(customDate) };
        }
        return { start: startOfDay(now), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  // Mock data for conversations with enhanced details
  const conversations = [
    {
      id: 1,
      customer: 'John Smith',
      email: 'john@example.com',
      message: 'Can I book a meeting for next Tuesday at 2 PM?',
      time: '2 minutes ago',
      status: 'resolved',
      responses: 3,
      lastActivity: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: 2,
      customer: 'Sarah Johnson',
      email: 'sarah@example.com',
      message: 'What are your available hours this week?',
      time: '15 minutes ago',
      status: 'active',
      responses: 5,
      lastActivity: new Date(Date.now() - 15 * 60 * 1000)
    },
    {
      id: 3,
      customer: 'Mike Wilson',
      email: 'mike@example.com',
      message: 'I need to reschedule my appointment from Friday',
      time: '1 hour ago',
      status: 'resolved',
      responses: 2,
      lastActivity: new Date(Date.now() - 60 * 60 * 1000)
    },
    {
      id: 4,
      customer: 'Emma Davis',
      email: 'emma@example.com',
      message: 'Do you offer weekend appointments?',
      time: '2 hours ago',
      status: 'pending',
      responses: 1,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  ];

  // Filter conversations based on date range
  const dateRange = getDateRange();
  const filteredConversations = conversations.filter(conv => 
    conv.lastActivity >= dateRange.start && conv.lastActivity <= dateRange.end
  );

  // Calculate dashboard metrics
  const totalConversations = filteredConversations.length;
  const avgResponses = filteredConversations.length > 0 
    ? (filteredConversations.reduce((sum, conv) => sum + conv.responses, 0) / filteredConversations.length).toFixed(1)
    : '0';

  const handleViewDetails = (conversationId: number) => {
    navigate(`/conversations/${conversationId}`);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-900 min-h-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">WhatsApp Conversations</h1>
          <p className="text-gray-400 mt-2">View and manage customer interactions with your booking assistant</p>
        </div>

        {/* Mini Dashboard */}
        <div className="mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Conversation Analytics
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="day">Vandaag</SelectItem>
                      <SelectItem value="week">Deze week</SelectItem>
                      <SelectItem value="month">Deze maand</SelectItem>
                      <SelectItem value="custom">Aangepast</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {timeFilter === 'custom' && (
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-48 justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600",
                            !customDate && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDate ? format(customDate, "PPP", { locale: nl }) : "Selecteer datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600" align="start">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={(date) => {
                            setCustomDate(date);
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                          className="bg-gray-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Totaal Gesprekken</p>
                      <p className="text-2xl font-bold text-white">{totalConversations}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Gemiddelde Reacties</p>
                      <p className="text-2xl font-bold text-white">{avgResponses}</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-400" />
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Actieve Gesprekken</p>
                      <p className="text-2xl font-bold text-white">
                        {filteredConversations.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                    <UserIcon className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversations List */}
        <div className="grid gap-4">
          {filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="bg-gray-800 border-gray-700 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white">{conversation.customer}</h3>
                          <p className="text-sm text-gray-400">{conversation.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              conversation.status === 'active' ? 'default' : 
                              conversation.status === 'pending' ? 'destructive' : 
                              'secondary'
                            }
                            className={conversation.status === 'active' ? 'bg-green-600' : ''}
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-3">{conversation.message}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {conversation.time}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {conversation.responses} responses
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          onClick={() => handleViewDetails(conversation.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredConversations.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-gray-300">Geen gesprekken gevonden</CardTitle>
              <CardDescription className="text-gray-400">
                Er zijn geen gesprekken in de geselecteerde periode.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Conversations;
