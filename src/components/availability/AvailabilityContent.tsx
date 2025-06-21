
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-3 space-y-8">
            {/* Daily Availability */}
            <div className="bg-card border border-border rounded-lg p-6">
              <DailyAvailability onChange={onUnsavedChanges} />
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
              
              <DateOverrides onChange={onUnsavedChanges} />
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
      </div>
    );
  }

  if (activeTab === 'limits') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="max-w-4xl">
          <Limits onChange={onUnsavedChanges} />
        </div>
      </div>
    );
  }

  if (activeTab === 'advanced') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="max-w-4xl">
          <Advanced onChange={onUnsavedChanges} />
        </div>
      </div>
    );
  }

  return null;
};
