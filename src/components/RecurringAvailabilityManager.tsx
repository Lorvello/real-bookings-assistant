
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat } from 'lucide-react';
import { useRecurringPatterns } from '@/hooks/useRecurringPatterns';
import { RecurringPatternCreator } from './RecurringPatternCreator';
import { RecurringPatternsList } from './RecurringPatternsList';

interface RecurringAvailabilityManagerProps {
  calendarId: string;
}

export function RecurringAvailabilityManager({ calendarId }: RecurringAvailabilityManagerProps) {
  const {
    patterns,
    loading,
    createPattern,
    deletePattern,
    togglePattern
  } = useRecurringPatterns(calendarId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Repeat className="h-5 w-5 text-primary" />
              <CardTitle>Terugkerende Beschikbaarheid</CardTitle>
            </div>
            <RecurringPatternCreator 
              calendarId={calendarId}
              onPatternCreate={createPattern}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-muted-foreground">
              Maak terugkerende patronen voor je beschikbaarheid. Perfect voor wisselende diensten, 
              seizoensgebonden schema's of complexe werkroosters.
            </p>
          </div>
          
          <RecurringPatternsList
            patterns={patterns}
            onTogglePattern={togglePattern}
            onDeletePattern={deletePattern}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
