
import React from 'react';
import { Shield, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarOwnershipIndicatorProps {
  isOwner: boolean;
  ownerName?: string;
  calendarName: string;
  memberCount?: number;
}

export const CalendarOwnershipIndicator: React.FC<CalendarOwnershipIndicatorProps> = ({
  isOwner,
  ownerName,
  calendarName,
  memberCount = 1
}) => {
  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border">
      <Calendar className="h-5 w-5 text-primary" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-foreground truncate">
            {calendarName}
          </span>
          
          {isOwner ? (
            <Badge variant="default" className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Eigenaar</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>Lid</span>
            </Badge>
          )}
        </div>
        
        {!isOwner && ownerName && (
          <p className="text-xs text-muted-foreground mt-1">
            Eigenaar: {ownerName}
          </p>
        )}
        
        {memberCount > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            {memberCount} {memberCount === 1 ? 'lid' : 'leden'}
          </p>
        )}
      </div>
    </div>
  );
};
