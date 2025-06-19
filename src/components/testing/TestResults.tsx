
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
  timestamp: Date;
}

interface TestResultsProps {
  results: TestResult[];
}

export function TestResults({ results }: TestResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>Geen test resultaten beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {results.map((result, index) => (
        <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <div className="flex-shrink-0 mt-0.5">
            {result.status === 'passed' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : result.status === 'failed' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{result.name}</h4>
              <Badge 
                variant={
                  result.status === 'passed' ? 'default' : 
                  result.status === 'failed' ? 'destructive' : 
                  'secondary'
                }
                className="text-xs"
              >
                {result.status === 'passed' ? 'Geslaagd' : 
                 result.status === 'failed' ? 'Gefaald' : 
                 'Bezig'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-1">
              {result.message}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {format(result.timestamp, 'HH:mm:ss', { locale: nl })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
