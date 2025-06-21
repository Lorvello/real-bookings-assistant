
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
import { Save, Calendar, Settings, CheckCircle, Clock, Shield } from 'lucide-react';

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
      await handleUpdateProfile();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full animate-ping opacity-20 mx-auto"></div>
          </div>
          <div className="text-xl font-medium text-foreground">Laden van instellingen...</div>
          <div className="text-sm text-muted-foreground">Een moment geduld</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-b border-border/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-8 md:p-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-foreground">
                      Beschikbaarheid
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <p className="text-muted-foreground">
                        Configureer je persoonlijke beschikbaarheid voor afspraken
                      </p>
                    </div>
                  </div>
                </div>
                
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      Je hebt niet-opgeslagen wijzigingen
                    </span>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges || loading}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 min-w-[180px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Wijzigingen Opslaan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Daily Availability Section */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span>Dagelijkse Beschikbaarheid</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Stel je standaard werkuren in per dag van de week
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <DailyAvailability 
              onChange={() => setHasUnsavedChanges(true)}
            />
            
            <div className="relative">
              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-card px-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </div>
            </div>
            
            <DateOverrides 
              onChange={() => setHasUnsavedChanges(true)}
            />
          </CardContent>
        </Card>

        {/* Advanced Settings Section */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg">
                <Settings className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <span>Geavanceerde Instellingen</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  Verfijn je afsprakensysteem met professionele opties
                </p>
              </div>
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

        {/* Success Message Card */}
        {!hasUnsavedChanges && !loading && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Instellingen zijn bijgewerkt</p>
                  <p className="text-sm text-muted-foreground">Je beschikbaarheid is succesvol opgeslagen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom Action Bar */}
        <div className="sticky bottom-6 z-10">
          <div className="flex justify-center">
            <div className="bg-card/95 backdrop-blur-lg border border-border/50 rounded-2xl p-4 shadow-2xl">
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges || loading}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 min-w-[220px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Bezig met opslaan...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {hasUnsavedChanges ? 'Wijzigingen Opslaan' : 'Alles is opgeslagen'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
