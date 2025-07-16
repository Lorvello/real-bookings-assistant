
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Info, Globe } from 'lucide-react';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';
import { COMPREHENSIVE_TIMEZONES } from './TimezoneData';

interface AvailabilityContentProps {
  activeTab: string;
  onUnsavedChanges: () => void;
}

export const AvailabilityContent: React.FC<AvailabilityContentProps> = ({
  activeTab,
  onUnsavedChanges
}) => {
  if (activeTab === 'schedule') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background/95">
        <div className="max-w-7xl mx-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-3 space-y-8">
              {/* Daily Availability */}
              <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-5 shadow-lg shadow-black/5">
                <DailyAvailability onChange={onUnsavedChanges} />
              </div>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Timezone */}
              <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary/20 rounded-2xl">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">Timezone</h3>
                </div>
                <Select defaultValue="Europe/Amsterdam">
                  <SelectTrigger className="w-full bg-background/80 border-border/60 rounded-2xl hover:border-primary/40 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border rounded-2xl max-h-80 overflow-y-auto">
                    {COMPREHENSIVE_TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        {timezone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'overrides') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background/95">
        <div className="max-w-7xl mx-auto p-5">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-2xl">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Schedule exceptions
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add dates when your availability differs from your standard working hours.
                </p>
              </div>
            </div>
            
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-5 shadow-lg shadow-black/5">
              <DateOverrides onChange={onUnsavedChanges} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
