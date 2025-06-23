
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900/50">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Content - Left Side (4/5 width) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Daily Availability - Compact Card */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                <DailyAvailability onChange={onUnsavedChanges} />
              </div>

              {/* Date Overrides - Compact Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-blue-500/10 rounded-xl">
                    <Info className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-slate-900">
                      Uitzonderingen op schema
                    </h3>
                    <p className="text-xs text-slate-600">
                      Voeg datums toe waarop je beschikbaarheid afwijkt van je standaard werkuren.
                    </p>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                  <DateOverrides onChange={onUnsavedChanges} />
                </div>
              </div>
            </div>

            {/* Sidebar - Right Side (1/5 width) */}
            <div className="space-y-4">
              {/* Timezone - Compact */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1 bg-blue-500/10 rounded-lg">
                    <Globe className="h-3 w-3 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">Tijdzone</h3>
                </div>
                <Select defaultValue="europe-amsterdam">
                  <SelectTrigger className="w-full bg-slate-50/80 border-slate-200/60 rounded-xl h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="europe-amsterdam">Europa/Amsterdam</SelectItem>
                    <SelectItem value="europe-london">Europa/London</SelectItem>
                    <SelectItem value="america-new-york">Amerika/New_York</SelectItem>
                    <SelectItem value="asia-tokyo">Azië/Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Troubleshooter - Compact */}
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-1 bg-orange-500/10 rounded-lg">
                    <Wrench className="h-3 w-3 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900">Problemen?</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-slate-50/80 border-slate-200/60 hover:bg-slate-100 rounded-xl text-xs h-8"
                >
                  Probleemoplosser
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'limits') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900/50">
        <div className="max-w-5xl mx-auto p-4">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <Limits onChange={onUnsavedChanges} />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'advanced') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900/50">
        <div className="max-w-5xl mx-auto p-4">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <Advanced onChange={onUnsavedChanges} />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
