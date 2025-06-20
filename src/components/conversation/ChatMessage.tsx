
import React from 'react';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: {
    id: number;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    status: 'delivered' | 'read';
  };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div
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
  );
};
