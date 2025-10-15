
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
              No calendar selected
            </h3>
            <p className="text-muted-foreground">
              Select a calendar to manage recurring availability
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Recurring Availability</h1>
        <p className="text-muted-foreground mt-2">
          Manage recurring availability patterns for <strong>{selectedCalendar.name}</strong>
        </p>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Existing Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="create">New Pattern</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Patterns</CardTitle>
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
              <CardTitle>New Recurring Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <RecurringPatternCreator 
                calendarId={selectedCalendar.id}
                onPatternCreate={createPattern} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
