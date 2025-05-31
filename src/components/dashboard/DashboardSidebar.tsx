
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  MessageSquare, 
  ExternalLink,
  Download,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface DashboardSidebarProps {
  user: User;
  profile: any;
  popularServices: Array<{ name: string; percentage: number }>;
  onSignOut: () => void;
  onExportData: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  user,
  profile,
  popularServices,
  onSignOut,
  onExportData
}) => {
  const navigate = useNavigate();

  return (
    <div className="xl:col-span-1 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{profile?.full_name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Business</p>
            <p className="font-medium">{profile?.business_name || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {popularServices.length > 0 ? (
            popularServices.map((service, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{service.name}</span>
                  <span className="text-sm text-gray-500">{service.percentage}%</span>
                </div>
                <Progress value={service.percentage} className="h-2" />
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
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
            className="w-full justify-start" 
            variant="outline"
            onClick={() => alert('Broadcast feature coming soon!')}
          >
            <Send className="h-4 w-4 mr-2" />
            Broadcast Message
          </Button>
          <Button 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" 
            variant="outline"
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Free Trial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">6 Days Left</div>
            <p className="text-sm text-blue-700 mb-4">
              Your 7-day free trial is active.
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
