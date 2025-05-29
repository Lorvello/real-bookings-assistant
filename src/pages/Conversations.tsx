
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Clock, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Conversations = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600 mt-2">View and manage customer interactions with your booking assistant</p>
        </div>

        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{conversation.customer}</h3>
                          <p className="text-sm text-gray-500">{conversation.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={
                              conversation.status === 'active' ? 'default' : 
                              conversation.status === 'pending' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {conversation.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{conversation.message}</p>
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
                        <Button variant="outline" size="sm">
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
          <Card>
            <CardHeader className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-gray-600">No conversations yet</CardTitle>
              <CardDescription>
                Your booking assistant hasn't had any conversations yet. Once customers start interacting, they'll appear here.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Conversations;
