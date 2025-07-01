
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { BulkProcessingResults } from '../types/webhookTypes';

interface ProcessingResultsProps {
  results: BulkProcessingResults;
}

export function ProcessingResults({ results }: ProcessingResultsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{results.totalBookings}</div>
          <div className="text-sm text-gray-600">Totaal Bookings</div>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{results.webhooksCreated}</div>
          <div className="text-sm text-gray-600">Webhooks Aangemaakt</div>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{results.webhooksSent}</div>
          <div className="text-sm text-gray-600">Succesvol Verzonden</div>
        </div>
        <div className="p-4 border rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">{results.pendingWebhooks}</div>
          <div className="text-sm text-gray-600">Nog Pending</div>
        </div>
      </div>

      {results.repairResults && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-orange-200 rounded-lg text-center bg-orange-50">
            <div className="text-xl font-bold text-orange-700">{results.repairResults.updated_bookings}</div>
            <div className="text-sm text-orange-600">Bookings Gekoppeld</div>
          </div>
          <div className="p-4 border border-orange-200 rounded-lg text-center bg-orange-50">
            <div className="text-xl font-bold text-orange-700">{results.repairResults.created_intents}</div>
            <div className="text-sm text-orange-600">Intents Aangemaakt</div>
          </div>
        </div>
      )}

      {results.pendingWebhooks === 0 && results.webhooksSent > 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Alle bookings zijn succesvol naar n8n gestuurd met complete data!
          </span>
        </div>
      )}
    </div>
  );
}
