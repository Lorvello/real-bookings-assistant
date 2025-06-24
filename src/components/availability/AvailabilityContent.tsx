
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Info, Globe, Wrench } from 'lucide-react';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';

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
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-3 space-y-8">
              {/* Daily Availability */}
              <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 shadow-lg shadow-black/5">
                <DailyAvailability onChange={onUnsavedChanges} />
              </div>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Timezone */}
              <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-2xl">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">Timezone</h3>
                </div>
                <Select defaultValue="europe-amsterdam">
                  <SelectTrigger className="w-full bg-background/80 border-border/60 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border rounded-2xl">
                    <SelectItem value="europe-amsterdam">Europe/Amsterdam</SelectItem>
                    <SelectItem value="europe-london">Europe/London</SelectItem>
                    <SelectItem value="america-new-york">America/New_York</SelectItem>
                    <SelectItem value="asia-tokyo">Asia/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Troubleshooter */}
              <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-2xl">
                    <Wrench className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">Problems with your schedule?</h3>
                </div>
                <Button
                  variant="outline"
                  className="w-full bg-background/80 border-border/60 hover:bg-muted rounded-2xl"
                >
                  Start troubleshooter
                </Button>
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
        <div className="max-w-7xl mx-auto p-6">
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
            
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 shadow-lg shadow-black/5">
              <DateOverrides onChange={onUnsavedChanges} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
