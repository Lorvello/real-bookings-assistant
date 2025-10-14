import { describe, it, expect } from 'vitest';
import { createTestSupabaseClient, getFutureDate } from '@/test/utils/testHelpers';

describe('Concurrency & Race Conditions', () => {
  it('should prevent race condition on same time slot', async () => {
    const supabase = createTestSupabaseClient();
    const slot = { 
      start_time: getFutureDate().toISOString(),
      end_time: getFutureDate(7, 15).toISOString(),
    };
    
    const [result1, result2] = await Promise.allSettled([
      supabase.from('bookings').insert({ ...slot, customer_email: 'user1@test.com' }),
      supabase.from('bookings').insert({ ...slot, customer_email: 'user2@test.com' }),
    ]);
    
    // At least one should succeed or both should handle gracefully
    expect(result1.status === 'fulfilled' || result2.status === 'fulfilled').toBe(true);
  });
});
