
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ConversationHeader } from '@/components/conversation/ConversationHeader';
import { ChatHistory } from '@/components/conversation/ChatHistory';
import { CustomerInfoSidebar } from '@/components/conversation/CustomerInfoSidebar';

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
      type: 'user' as const,
      content: 'Hi, can I book a meeting for next Tuesday at 2 PM?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'read' as const
    },
    {
      id: 2,
      type: 'bot' as const,
      content: 'Hello! I\'d be happy to help you book a meeting. Let me check our availability for Tuesday at 2 PM.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 1000),
      status: 'delivered' as const
    },
    {
      id: 3,
      type: 'bot' as const,
      content: 'Great news! Tuesday at 2 PM is available. What type of service would you like to book?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45 * 1000),
      status: 'delivered' as const
    },
    {
      id: 4,
      type: 'user' as const,
      content: 'I need a consultation for my business strategy. How long does it usually take?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
      status: 'read' as const
    },
    {
      id: 5,
      type: 'bot' as const,
      content: 'A business strategy consultation typically takes 60-90 minutes. I\'ll book you for 90 minutes to make sure we have enough time to cover everything thoroughly.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000 + 15 * 1000),
      status: 'delivered' as const
    },
    {
      id: 6,
      type: 'bot' as const,
      content: 'Perfect! I\'ve booked your business strategy consultation for Tuesday, [DATE] at 2:00 PM - 3:30 PM. You\'ll receive a confirmation email shortly with all the details and meeting link.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000 + 30 * 1000),
      status: 'delivered' as const
    },
    {
      id: 7,
      type: 'user' as const,
      content: 'Thank you so much! Looking forward to it.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000),
      status: 'read' as const
    }
  ];

  const handleBack = () => {
    navigate('/conversations');
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-gray-900 min-h-full">
        <ConversationHeader
          startedAt={conversation.startedAt}
          status={conversation.status}
          onBack={handleBack}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat History */}
          <div className="lg:col-span-3">
            <ChatHistory
              customer={conversation.customer}
              messages={messages}
            />
          </div>

          {/* Customer Info Sidebar */}
          <div className="lg:col-span-1">
            <CustomerInfoSidebar
              customerInfo={{
                customer: conversation.customer,
                email: conversation.email,
                phone: conversation.phone,
                lastActivity: conversation.lastActivity
              }}
              messages={messages}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConversationDetail;
