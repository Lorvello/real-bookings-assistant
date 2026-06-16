
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  MessageSquare,
  ExternalLink,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { useServicePopularity } from '@/hooks/useServicePopularity';
import { useConversationCalendar } from '@/contexts/ConversationCalendarContext';

interface DashboardSidebarProps {
  user: User;
  profile: any;
  onSignOut: () => void;
  onExportData: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  user,
  profile,
  onSignOut,
  onExportData
}) => {
  const navigate = useNavigate();
  const { selectedCalendarId } = useConversationCalendar();
  const { data: popularServices = [], isLoading: servicesLoading } = useServicePopularity(selectedCalendarId || undefined);

  return (
    <div className="xl:col-span-1 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{profile?.full_name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Business</p>
            <p className="font-medium">{profile?.business_name || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {servicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-2 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : popularServices.length > 0 ? (
            popularServices.slice(0, 5).map((service, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">{service.service_name}</span>
                  <span className="text-sm text-muted-foreground">{service.percentage}%</span>
                </div>
                <Progress value={service.percentage} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {service.booking_count} bookings
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No booking data available yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={() => navigate('/conversations')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View Conversations
          </Button>
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={() => window.open('https://calendar.google.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Calendar
          </Button>
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={onExportData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button
            className="w-full justify-start text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive/10"
            variant="outline"
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};
