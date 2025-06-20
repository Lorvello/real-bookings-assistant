
import React, { useState } from 'react';
import { Calendar, Settings, Users, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverrideManager } from './availability/OverrideManager';
import { useRealtimeCalendar } from '@/hooks/useRealtimeCalendar';

interface AvailabilityPanelProps {
  calendarId: string;
}

export function AvailabilityPanel({ calendarId }: AvailabilityPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { availabilityRules, availabilityOverrides, isLoading, error, refetchData } = useRealtimeCalendar(calendarId);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (error) {
    return (
      <div className={`fixed right-0 top-0 h-full transition-all duration-300 ease-in-out z-40 ${
        isCollapsed ? 'w-12' : 'w-96'
      }`}>
        <div className="h-full bg-card border-l border-border shadow-xl flex flex-col">
          {/* Collapse Toggle */}
          <button
            onClick={handleToggle}
            className="absolute -left-3 top-6 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <div className={`w-1 h-1 bg-foreground rounded-full transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`} />
          </button>

          {!isCollapsed && (
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Fout bij laden</h3>
                <p className="text-muted-foreground mb-4 text-sm">{error}</p>
                <button
                  onClick={refetchData}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Opnieuw proberen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed right-0 top-0 h-full transition-all duration-300 ease-in-out z-40 ${
      isCollapsed ? 'w-12' : 'w-96'
    }`}>
      <div className="h-full bg-card border-l border-border shadow-xl flex flex-col">
        {/* Collapse Toggle */}
        <button
          onClick={handleToggle}
          className="absolute -left-3 top-6 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <div className={`w-1 h-1 bg-foreground rounded-full transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Collapsed State - Just Icons */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center justify-start pt-20 space-y-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-border">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Beschikbaarheid</h2>
                  <p className="text-sm text-muted-foreground">Beheer uw agenda</p>
                </div>
              </div>
              
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  <span>Laden...</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="schema" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
                  <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
                  <TabsTrigger value="uitzonderingen" className="text-xs">Uitzonderingen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="schema" className="flex-1 overflow-auto p-6 pt-4">
                  <div className="space-y-4">
                    {/* Current Schedule Overview */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">Huidige Schema</h3>
                      {availabilityRules.length > 0 ? (
                        <div className="space-y-1">
                          {['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'].map((day, index) => {
                            const rule = availabilityRules.find(r => r.day_of_week === (index + 1) % 7);
                            return (
                              <div key={day} className="flex justify-between items-center py-2 px-3 bg-muted rounded-lg">
                                <span className="text-sm font-medium text-foreground">{day}</span>
                                <span className="text-xs text-muted-foreground">
                                  {rule?.is_available ? `${rule.start_time} - ${rule.end_time}` : 'Gesloten'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Geen schema gevonden</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Werkdagen</p>
                            <p className="text-sm font-semibold text-foreground">
                              {availabilityRules.filter(r => r.is_available).length}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Uitzonderingen</p>
                            <p className="text-sm font-semibold text-foreground">
                              {availabilityOverrides.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="uitzonderingen" className="flex-1 overflow-auto p-6 pt-4">
                  <OverrideManager calendarId={calendarId} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
