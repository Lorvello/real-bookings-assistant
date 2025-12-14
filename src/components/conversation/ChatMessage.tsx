
import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
      className={cn(
        "flex",
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 shadow-md",
          message.type === 'user'
            ? 'bg-[hsl(142,70%,35%)] text-white rounded-2xl rounded-br-sm'
            : 'bg-gray-700 text-white rounded-2xl rounded-bl-sm border border-gray-600'
        )}
      >
        {/* Message content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        
        {/* Timestamp and status */}
        <div className={cn(
          "flex items-center justify-end gap-1.5 text-xs mt-1.5",
          message.type === 'user' ? 'text-white/70' : 'text-gray-400'
        )}>
          <span>{format(message.timestamp, 'HH:mm')}</span>
          {message.type === 'user' && (
            <span className={cn(
              "text-xs",
              message.status === 'read' ? 'text-blue-300' : 'text-white/70'
            )}>
              ✓✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
