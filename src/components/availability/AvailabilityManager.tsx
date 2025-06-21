
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useSettingsData } from '@/hooks/useSettingsData';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';
import { Limits } from './Limits';
import { Advanced } from './Advanced';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ArrowLeft, Calendar, User, Building2, Info } from 'lucide-react';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar } = useCalendarContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [setToDefault, setSetToDefault] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const {
    calendarSettings,
    setCalendarSettings,
    loading,
    handleUpdateProfile
  } = useSettingsData();

  // Helper function to get better calendar display name
  const getCalendarDisplayName = (calendar: any) => {
    if (calendar?.name === 'Mijn Kalender') {
      const businessName = profile?.business_name;
      const userName = profile?.full_name?.split(' ')[0] || 'Mijn';
      
      if (businessName) {
        return `${businessName} Kalender`;
      }
      return `${userName} Kalender`;
    }
    return calendar?.name || 'Onbekende Kalender';
  };

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

  if (!selectedCalendar) {
    return (
      <div className="min-h-screen bg-background">
        {/* Clear user context header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">
                  {profile?.business_name || profile?.full_name || user?.email}
                </div>
                <div className="text-sm text-muted-foreground">Ingelogd als eigenaar</div>
              </div>
            </div>
          </div>
        </div>
        
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
    <div className="min-h-screen bg-background">
      {/* Clear Calendar Ownership Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-4 py-3 bg-primary/5 rounded-lg border">
                <Calendar className="h-6 w-6 text-primary" />
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    {getCalendarDisplayName(selectedCalendar)}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Eigenaar: {profile?.full_name || user?.email}</span>
                    {profile?.business_name && (
                      <>
                        <Building2 className="h-3 w-3 ml-2" />
                        <span>{profile.business_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <CalendarSwitcher />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <h1 className="text-xl font-semibold text-foreground">Beschikbaarheid Beheren</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Instellen als standaard</span>
                <Switch
                  checked={setToDefault}
                  onCheckedChange={setSetToDefault}
                />
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges || loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Schema
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'limits'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Limieten
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Geavanceerd
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-3 space-y-8">
              {/* Daily Availability */}
              <div className="bg-card border border-border rounded-lg p-6">
                <DailyAvailability 
                  onChange={() => setHasUnsavedChanges(true)}
                />
              </div>

              {/* Date Overrides */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                    Uitzonderingen op schema
                  </h3>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Voeg datums toe waarop je beschikbaarheid afwijkt van je standaard werkuren.
                </p>
                
                <DateOverrides 
                  onChange={() => setHasUnsavedChanges(true)}
                />
              </div>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Timezone */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Tijdzone</h3>
                <Select defaultValue="europe-amsterdam">
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="europe-amsterdam">Europa/Amsterdam</SelectItem>
                    <SelectItem value="europe-london">Europa/London</SelectItem>
                    <SelectItem value="america-new-york">Amerika/New_York</SelectItem>
                    <SelectItem value="asia-tokyo">Azië/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Troubleshooter */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Problemen met je schema?</h3>
                <Button
                  variant="outline"
                  className="w-full bg-background border-border hover:bg-muted"
                >
                  Probleemoplosser starten
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'limits' && (
          <div className="max-w-4xl">
            <Limits onChange={() => setHasUnsavedChanges(true)} />
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="max-w-4xl">
            <Advanced onChange={() => setHasUnsavedChanges(true)} />
          </div>
        )}
      </div>
    </div>
  );
};
