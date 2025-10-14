import { createClient } from '@supabase/supabase-js';

/**
 * Create a test Supabase client
 */
export function createTestSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Generate a unique test phone number
 */
export function generateTestPhone(): string {
  const randomNumber = Math.floor(Math.random() * 900000000) + 100000000;
  return `+316${randomNumber}`;
}

/**
 * Create a future date for booking tests
 */
export function getFutureDate(daysFromNow: number = 7, hour: number = 14): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Wait for a specified time (for debouncing tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock successful Supabase response
 */
export function mockSupabaseSuccess<T>(data: T) {
  return { data, error: null };
}

/**
 * Mock Supabase error response
 */
export function mockSupabaseError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || 'PGRST116',
      details: '',
      hint: '',
    },
  };
}

/**
 * Generate random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Create test booking data
 */
export function createTestBookingData(overrides: any = {}) {
  return {
    customer_name: 'Test Customer',
    customer_email: generateTestEmail(),
    customer_phone: generateTestPhone(),
    start_time: getFutureDate().toISOString(),
    end_time: getFutureDate(7, 15).toISOString(),
    service_type_id: 'test-service-id',
    calendar_id: 'test-calendar-id',
    status: 'pending',
    ...overrides,
  };
}

/**
 * Query security logs for testing
 */
export async function querySecurityLogs(pattern: string) {
  const supabase = createTestSupabaseClient();
  const { data, error } = await supabase
    .from('security_events_log')
    .select('*')
    .ilike('event_data', `%${pattern}%`)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  return data || [];
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userId: string) {
  const supabase = createTestSupabaseClient();
  
  // Delete test bookings
  await supabase.from('bookings').delete().eq('customer_email', generateTestEmail('test'));
  
  // Delete test calendars
  await supabase.from('calendars').delete().ilike('name', '%TEST%');
  
  console.log('Test data cleaned up');
}
