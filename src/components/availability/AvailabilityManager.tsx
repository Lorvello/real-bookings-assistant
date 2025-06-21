
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettingsData } from '@/hooks/useSettingsData';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';
import { AdvancedSettings } from './AdvancedSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Calendar, Settings } from 'lucide-react';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    calendarSettings,
    setCalendarSettings,
    loading,
    handleUpdateProfile
  } = useSettingsData();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    try {
      await handleUpdateProfile(calendarSettings);
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
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              Beschikbaarheid
            </h1>
            <p className="text-muted-foreground mt-1">
              Configureer je persoonlijke beschikbaarheid voor afspraken
            </p>
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Daily Availability Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Dagelijkse Beschikbaarheid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <DailyAvailability 
              onChange={() => setHasUnsavedChanges(true)}
            />
            
            <Separator className="bg-border" />
            
            <DateOverrides 
              onChange={() => setHasUnsavedChanges(true)}
            />
          </CardContent>
        </Card>

        {/* Advanced Settings Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Geavanceerde Instellingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedSettings 
              settings={calendarSettings}
              onChange={(settings) => {
                setCalendarSettings(settings);
                setHasUnsavedChanges(true);
              }}
            />
          </CardContent>
        </Card>

        {/* Bottom Save Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loading}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Opslaan...' : 'Wijzigingen Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
};
