
export interface RepairResult {
  updated_bookings: number;
  created_intents: number;
}

export interface ResendResult {
  processed_bookings: number;
}

export interface BulkProcessingResults {
  totalBookings: number;
  webhooksCreated: number;
  webhooksSent: number;
  pendingWebhooks: number;
  repairResults?: RepairResult;
}

export interface BulkWebhookProcessorProps {
  calendarId: string;
}
