
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Database } from 'lucide-react';

interface CalendarDebugInfoProps {
  show?: boolean;
}

export const CalendarDebugInfo: React.FC<CalendarDebugInfoProps> = ({ 
  show = process.env.NODE_ENV === 'development' 
}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { selectedCalendar, calendars } = useCalendarContext();

  if (!show) return null;

  return (
    <Card className="border-dashed border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span>Debug Info (Development Only)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Current User */}
        <div className="flex items-center space-x-2">
          <User className="h-3 w-3" />
          <span className="font-medium">Current User:</span>
          <Badge variant="outline">{user?.id?.substring(0, 8)}...</Badge>
          <span>{user?.email}</span>
        </div>

        {/* Profile Info */}
        {profile && (
          <div className="ml-5 space-y-1">
            <div>Full Name: {profile.full_name || 'Not set'}</div>
            <div>Business: {profile.business_name || 'Not set'}</div>
          </div>
        )}

        {/* Selected Calendar */}
        {selectedCalendar && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">Selected Calendar:</span>
            <Badge variant="outline">{selectedCalendar.id.substring(0, 8)}...</Badge>
            <span>"{selectedCalendar.name}"</span>
          </div>
        )}

        {/* All Calendars */}
        <div className="space-y-1">
          <div className="font-medium">All User Calendars:</div>
          {calendars.map(cal => (
            <div key={cal.id} className="ml-5 flex items-center space-x-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: cal.color || '#3B82F6' }}
              />
              <Badge variant="outline" className="text-xs">
                {cal.id.substring(0, 8)}...
              </Badge>
              <span>"{cal.name}"</span>
              {cal.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
            </div>
          ))}
        </div>

        {/* Data Relationship */}
        <div className="pt-2 border-t border-orange-200">
          <div className="text-xs text-orange-700">
            <strong>Data Ownership:</strong> User {user?.id?.substring(0, 8)}... owns {calendars.length} calendar(s)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
