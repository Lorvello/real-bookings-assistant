
import React from 'react';
import { User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserContextHeaderProps {
  userName?: string;
  userEmail?: string;
  currentCalendarName?: string;
  businessName?: string;
}

export const UserContextHeader: React.FC<UserContextHeaderProps> = ({
  userName,
  userEmail,
  currentCalendarName,
  businessName
}) => {
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Current User Info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ingelogd als:</span>
              <span className="font-medium text-foreground">
                {userName || userEmail}
              </span>
              {businessName && (
                <Badge variant="outline" className="text-xs">
                  {businessName}
                </Badge>
              )}
            </div>
          </div>

          {/* Current Calendar Info */}
          {currentCalendarName && (
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Bezig met kalender:</span>
              <span className="font-medium text-primary">
                {currentCalendarName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
