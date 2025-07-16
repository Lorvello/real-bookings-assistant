import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit2, Plus } from 'lucide-react';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';

interface AvailabilityOverviewProps {
  onChange: () => void;
}

export const AvailabilityOverview: React.FC<AvailabilityOverviewProps> = ({ onChange }) => {
  const {
    DAYS,
    availability,
    defaultCalendar,
    defaultSchedule
  } = useDailyAvailabilityManager(onChange);

  const formatTimeRange = (timeBlocks: any[]) => {
    if (!timeBlocks || timeBlocks.length === 0) return 'Not available';
    
    return timeBlocks
      .map(block => `${block.startTime} - ${block.endTime}`)
      .join(', ');
  };

  const getAvailabilityStatus = () => {
    const configuredDays = DAYS.filter(day => 
      availability[day.key]?.enabled && 
      availability[day.key]?.timeBlocks?.length > 0
    );
    
    return {
      total: DAYS.length,
      configured: configuredDays.length,
      isComplete: configuredDays.length === DAYS.length
    };
  };

  const status = getAvailabilityStatus();

  if (!defaultCalendar || !defaultSchedule) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">Loading availability...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Availability</h2>
              <p className="text-muted-foreground">
                {status.configured} of {status.total} days configured
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              status.isComplete 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {status.isComplete ? 'Complete' : 'In Progress'}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day) => {
          const dayData = availability[day.key];
          const isConfigured = dayData?.enabled && dayData?.timeBlocks?.length > 0;
          
          return (
            <Card 
              key={day.key} 
              className={`bg-card/90 backdrop-blur-sm border transition-all duration-200 hover:shadow-lg ${
                isConfigured 
                  ? 'border-primary/30 hover:border-primary/50' 
                  : 'border-border/60 hover:border-border'
              }`}
            >
              <CardContent className="p-5">
                <div className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isConfigured ? 'bg-green-500' : 'bg-muted'
                      }`} />
                      <div>
                        <h3 className="font-semibold text-foreground">{day.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {day.isWeekend ? 'Weekend' : 'Weekday'}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Availability Info */}
                  <div className="space-y-2">
                    {isConfigured ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-green-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Available</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimeRange(dayData.timeBlocks)}
                        </div>
                        {dayData.timeBlocks.length > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {dayData.timeBlocks.length} time blocks
                          </div>
                        )}
                      </div>
                    ) : dayData?.enabled === false ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Unavailable</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Day marked as unavailable
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm">Not configured</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Click to set availability
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{status.configured}</div>
            <div className="text-sm text-muted-foreground">Days Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {DAYS.reduce((total, day) => {
                const dayData = availability[day.key];
                if (dayData?.enabled && dayData?.timeBlocks) {
                  return total + dayData.timeBlocks.length;
                }
                return total;
              }, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Time Blocks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {Math.round((status.configured / status.total) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Configuration Complete</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          className="px-6"
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Schedule
        </Button>
        <Button
          className="px-6 bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Exception
        </Button>
      </div>
    </div>
  );
};