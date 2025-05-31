
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Pause, Play, Activity } from 'lucide-react';

interface AiBotStatusCardProps {
  isActive?: boolean;
  onToggle?: () => void;
}

export const AiBotStatusCard: React.FC<AiBotStatusCardProps> = ({ 
  isActive = true, 
  onToggle 
}) => {
  const statusIndicator = isActive ? (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
        Active
      </Badge>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
      <Badge className="bg-gray-100 text-gray-800 border-gray-200" variant="outline">
        Paused
      </Badge>
    </div>
  );

  return (
    <Card className={`${isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Bot className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
          WhatsApp AI Bot
          {statusIndicator}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">24/7</div>
            <div className="text-sm text-gray-600">Availability</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">~2s</div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-700">Auto-booking enabled</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-gray-700">Calendar sync active</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button
            onClick={onToggle}
            variant={isActive ? "outline" : "default"}
            className={`w-full ${
              isActive 
                ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Bot
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activate Bot
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
