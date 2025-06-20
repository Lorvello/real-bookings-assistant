
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  status: 'delivered' | 'read';
}

interface ChatHistoryProps {
  customer: string;
  messages: Message[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ customer, messages }) => {
  return (
    <Card className="bg-gray-800 border-gray-700 h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b border-gray-700">
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium">{customer}</h3>
            <p className="text-sm text-gray-400 font-normal">WhatsApp Chat</p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-850">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </CardContent>
    </Card>
  );
};
