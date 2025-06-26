
export interface WaitlistEntry {
  id: string;
  calendar_id: string;
  service_type_id: string;
  customer_name: string;
  customer_email?: string | null; // Now properly nullable
  preferred_date: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  flexibility: 'specific' | 'morning' | 'afternoon' | 'anytime';
  status: 'waiting' | 'notified' | 'converted' | 'expired';
  created_at: string;
  notified_at?: string;
  expires_at?: string;
}

export interface WaitlistFormData {
  customer_name: string;
  customer_email?: string; // Made optional
  preferred_date: Date;
  preferred_time_start?: string;
  preferred_time_end?: string;
  flexibility: 'specific' | 'morning' | 'afternoon' | 'anytime';
}
