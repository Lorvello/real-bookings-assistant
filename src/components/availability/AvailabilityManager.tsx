
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettingsData } from '@/hooks/useSettingsData';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';
import { Limits } from './Limits';
import { Advanced } from './Advanced';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ArrowLeft, Edit, Trash2, Info } from 'lucide-react';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [setToDefault, setSetToDefault] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

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
    <div className="min-h-screen bg-background">
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
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-foreground">Working Hours</h1>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Mon - Fri, 08:00 - 19:00</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Set to Default</span>
                <Switch
                  checked={setToDefault}
                  onCheckedChange={setSetToDefault}
                />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges || loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? 'Saving...' : 'Save'}
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
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'limits'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Limits
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Advanced
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
                    Date overrides
                  </h3>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add dates when your availability changes from your daily hours.
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
                <h3 className="text-sm font-medium text-foreground mb-3">Timezone</h3>
                <Select defaultValue="europe-amsterdam">
                  <SelectTrigger className="w-full bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="europe-amsterdam">Europe/Amsterdam</SelectItem>
                    <SelectItem value="europe-london">Europe/London</SelectItem>
                    <SelectItem value="america-new-york">America/New_York</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Troubleshooter */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">Something doesn't look right?</h3>
                <Button
                  variant="outline"
                  className="w-full bg-background border-border hover:bg-muted"
                >
                  Launch troubleshooter
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
