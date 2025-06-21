
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { UserContextHeader } from '@/components/common/UserContextHeader';
import { CalendarOwnershipIndicator } from '@/components/common/CalendarOwnershipIndicator';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { ImprovedDailyAvailability } from './ImprovedDailyAvailability';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Save } from 'lucide-react';

export const ImprovedAvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar } = useCalendarContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Generate better calendar display name
  const getCalendarDisplayName = () => {
    if (!selectedCalendar) return '';
    
    // If it's the default "Mijn Kalender", create a better name
    if (selectedCalendar.name === 'Mijn Kalender') {
      if (profile?.business_name) {
        return `${profile.business_name} Planning`;
      }
      const firstName = profile?.full_name?.split(' ')[0] || 'Jouw';
      return `${firstName} Planning`;
    }
    
    return selectedCalendar.name;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    try {
      // Save logic will be handled by the daily availability component
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">Laden...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!selectedCalendar) {
    return (
      <div className="min-h-screen bg-background">
        <UserContextHeader
          userName={profile?.full_name}
          userEmail={user?.email}
          businessName={profile?.business_name}
        />
        
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Geen kalender geselecteerd</h1>
            <p className="text-muted-foreground mb-6">
              Selecteer een kalender om de beschikbaarheid te beheren.
            </p>
            <CalendarSwitcher />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Beschikbaarheid</h1>
                <p className="text-sm text-gray-600">Stel je werkuren in</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <CalendarSwitcher />
              
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Context Card */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: selectedCalendar.color || '#3B82F6' }}
                />
                <div>
                  <CardTitle className="text-lg">{getCalendarDisplayName()}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Eigenaar: {profile?.full_name || 'Jij'}
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Clock className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Werkuren per dag
            </CardTitle>
            <p className="text-sm text-gray-600">
              Stel in wanneer je beschikbaar bent voor afspraken
            </p>
          </CardHeader>
          
          <CardContent>
            <ImprovedDailyAvailability 
              onChange={() => setHasUnsavedChanges(true)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
