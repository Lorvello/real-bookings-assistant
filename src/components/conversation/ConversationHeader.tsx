
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ConversationHeaderProps {
  startedAt: Date;
  status: string;
  onBack: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  startedAt,
  status,
  onBack
}) => {
  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-gray-300 hover:text-white hover:bg-gray-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to conversations
      </Button>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Conversation Details</h1>
          <p className="text-gray-400 mt-1">
            Started on {format(startedAt, "PPP 'at' HH:mm", { locale: nl })}
          </p>
        </div>
        <Badge 
          variant={status === 'active' ? 'default' : 'secondary'}
          className={status === 'active' ? 'bg-green-600' : ''}
        >
          {status}
        </Badge>
      </div>
    </div>
  );
};
