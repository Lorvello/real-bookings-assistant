
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Bot, Clock, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const ConversationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock conversation data - in real app this would come from the database
  const conversation = {
    id: parseInt(id || '1'),
    customer: 'John Smith',
    email: 'john@example.com',
    phone: '+31 6 12345678',
    status: 'resolved',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActivity: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
  };

  // Mock chat messages in WhatsApp style
  const messages = [
    {
      id: 1,
      type: 'user',
      content: 'Hi, can I book a meeting for next Tuesday at 2 PM?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'read'
    },
    {
      id: 2,
      type: 'bot',
      content: 'Hello! I\'d be happy to help you book a meeting. Let me check our availability for Tuesday at 2 PM.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 1000),
      status: 'delivered'
    },
    {
      id: 3,
      type: 'bot',
      content: 'Great news! Tuesday at 2 PM is available. What type of service would you like to book?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45 * 1000),
      status: 'delivered'
    },
    {
      id: 4,
      type: 'user',
      content: 'I need a consultation for my business strategy. How long does it usually take?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
      status: 'read'
    },
    {
      id: 5,
      type: 'bot',
      content: 'A business strategy consultation typically takes 60-90 minutes. I\'ll book you for 90 minutes to make sure we have enough time to cover everything thoroughly.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000 + 15 * 1000),
      status: 'delivered'
    },
    {
      id: 6,
      type: 'bot',
      content: 'Perfect! I\'ve booked your business strategy consultation for Tuesday, [DATE] at 2:00 PM - 3:30 PM. You\'ll receive a confirmation email shortly with all the details and meeting link.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000 + 30 * 1000),
      status: 'delivered'
    },
    {
      id: 7,
      type: 'user',
      content: 'Thank you so much! Looking forward to it.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000),
      status: 'read'
    }
  ];

  const handleBack = () => {
    navigate('/conversations');
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-900 min-h-full">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-gray-300 hover:text-white hover:bg-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar gesprekken
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Gesprek Details</h1>
              <p className="text-gray-400 mt-1">
                Gestart op {format(conversation.startedAt, "PPP 'om' HH:mm", { locale: nl })}
              </p>
            </div>
            <Badge 
              variant={conversation.status === 'active' ? 'default' : 'secondary'}
              className={conversation.status === 'active' ? 'bg-green-600' : ''}
            >
              {conversation.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat History */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-800 border-gray-700 h-[600px] flex flex-col">
              <CardHeader className="pb-3 border-b border-gray-700">
                <CardTitle className="text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{conversation.customer}</h3>
                    <p className="text-sm text-gray-400 font-normal">WhatsApp Chat</p>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-850">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative ${
                        message.type === 'user'
                          ? 'bg-green-600 text-white rounded-br-md'
                          : 'bg-gray-700 text-white rounded-bl-md border border-gray-600'
                      }`}
                    >
                      {/* Message content */}
                      <p className="text-sm mb-2">{message.content}</p>
                      
                      {/* Timestamp and status */}
                      <div className={`flex items-center justify-end gap-1 text-xs ${
                        message.type === 'user' ? 'text-green-100' : 'text-gray-400'
                      }`}>
                        <span>
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                        {message.type === 'user' && (
                          <div className="flex">
                            {message.status === 'delivered' && (
                              <span className="text-green-200">✓✓</span>
                            )}
                            {message.status === 'read' && (
                              <span className="text-blue-300">✓✓</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Message tail */}
                      <div
                        className={`absolute bottom-0 w-3 h-3 ${
                          message.type === 'user'
                            ? 'right-0 bg-green-600 transform rotate-45 translate-x-1 translate-y-1'
                            : 'left-0 bg-gray-700 transform rotate-45 -translate-x-1 translate-y-1 border-l border-b border-gray-600'
                        }`}
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Customer Info Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Klant Informatie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-white">{conversation.customer}</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{conversation.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{conversation.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-300">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <p>Laatste activiteit:</p>
                      <p className="text-gray-400">
                        {format(conversation.lastActivity, "PPP 'om' HH:mm", { locale: nl })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h4 className="font-medium text-white mb-2">Gesprek Statistieken</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Totaal berichten:</span>
                      <span>{messages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Klant berichten:</span>
                      <span>{messages.filter(m => m.type === 'user').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI berichten:</span>
                      <span>{messages.filter(m => m.type === 'bot').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duur gesprek:</span>
                      <span>3 min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConversationDetail;
