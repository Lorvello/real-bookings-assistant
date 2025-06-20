
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, User as UserIcon } from 'lucide-react';

const Conversations = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Mock data for conversations
  const conversations = [
    {
      id: 1,
      customer: 'John Smith',
      email: 'john@example.com',
      message: 'Can I book a meeting for next Tuesday at 2 PM?',
      time: '2 minutes ago',
      status: 'resolved',
      responses: 3
    },
    {
      id: 2,
      customer: 'Sarah Johnson',
      email: 'sarah@example.com',
      message: 'What are your available hours this week?',
      time: '15 minutes ago',
      status: 'active',
      responses: 5
    },
    {
      id: 3,
      customer: 'Mike Wilson',
      email: 'mike@example.com',
      message: 'I need to reschedule my appointment from Friday',
      time: '1 hour ago',
      status: 'resolved',
      responses: 2
    },
    {
      id: 4,
      customer: 'Emma Davis',
      email: 'emma@example.com',
      message: 'Do you offer weekend appointments?',
      time: '2 hours ago',
      status: 'pending',
      responses: 1
    }
  ];

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

        <div className="grid gap-4">
          {conversations.map((conversation) => (
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
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
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

        {conversations.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-gray-300">No conversations yet</CardTitle>
              <CardDescription className="text-gray-400">
                Your booking assistant hasn't had any conversations yet. Once customers start interacting, they'll appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Conversations;
