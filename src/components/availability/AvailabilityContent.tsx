
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Info, Globe, Wrench } from 'lucide-react';
import { DailyAvailability } from './DailyAvailability';
import { DateOverrides } from './DateOverrides';
import { Limits } from './Limits';
import { Advanced } from './Advanced';

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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-3 space-y-6">
            {/* Daily Availability */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
              <DailyAvailability onChange={onUnsavedChanges} />
            </div>

            {/* Date Overrides */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    Uitzonderingen op schema
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Voeg datums toe waarop je beschikbaarheid afwijkt van je standaard werkuren.
                  </p>
                </div>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
                <DateOverrides onChange={onUnsavedChanges} />
              </div>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-4">
            {/* Timezone */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1.5 bg-blue-500/20 rounded-xl">
                  <Globe className="h-3 w-3 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-foreground">Tijdzone</h3>
              </div>
              <Select defaultValue="europe-amsterdam">
                <SelectTrigger className="w-full bg-background/80 border-border/60 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border rounded-xl">
                  <SelectItem value="europe-amsterdam">Europa/Amsterdam</SelectItem>
                  <SelectItem value="europe-london">Europa/London</SelectItem>
                  <SelectItem value="america-new-york">Amerika/New_York</SelectItem>
                  <SelectItem value="asia-tokyo">Azië/Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Troubleshooter */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1.5 bg-orange-500/20 rounded-xl">
                  <Wrench className="h-3 w-3 text-orange-600" />
                </div>
                <h3 className="text-sm font-medium text-foreground">Problemen met je schema?</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-background/80 border-border/60 hover:bg-muted rounded-xl"
              >
                Probleemoplosser starten
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'limits') {
    return (
      <div className="max-w-4xl">
        <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
          <Limits onChange={onUnsavedChanges} />
        </div>
      </div>
    );
  }

  if (activeTab === 'advanced') {
    return (
      <div className="max-w-4xl">
        <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
          <Advanced onChange={onUnsavedChanges} />
        </div>
      </div>
    );
  }

  return null;
};
