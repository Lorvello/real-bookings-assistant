
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringPatternCreator } from './RecurringPatternCreator';
import { RecurringPatternsList } from './RecurringPatternsList';
import { useRecurringPatterns } from '@/hooks/useRecurringPatterns';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Calendar, Clock } from 'lucide-react';

export default function RecurringAvailabilityManager() {
  const { selectedCalendar } = useCalendarContext();
  const { patterns, loading, createPattern, updatePattern, deletePattern, togglePattern } = useRecurringPatterns(selectedCalendar?.id);

  if (!selectedCalendar) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Geen kalender geselecteerd
            </h3>
            <p className="text-muted-foreground">
              Selecteer een kalender om terugkerende beschikbaarheid te beheren
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Terugkerende Beschikbaarheid</h1>
        <p className="text-muted-foreground mt-2">
          Beheer terugkerende beschikbaarheidspatronen voor <strong>{selectedCalendar.name}</strong>
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Bestaande Patronen</span>
          </TabsTrigger>
          <TabsTrigger value="create">Nieuw Patroon</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Terugkerende Patronen</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringPatternsList
                patterns={patterns}
                onTogglePattern={togglePattern}
                onDeletePattern={deletePattern}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Nieuw Terugkerend Patroon</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringPatternCreator onPatternCreate={createPattern} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
