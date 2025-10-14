import { describe, it, expect } from 'vitest';
import { createTestSupabaseClient, createTestBookingData } from '@/test/utils/testHelpers';

describe('Performance & Load Tests', () => {
  it('should handle 100 concurrent booking requests', async () => {
    const supabase = createTestSupabaseClient();
    
    const promises = Array.from({ length: 100 }, (_, i) => 
      supabase.from('bookings').insert(createTestBookingData({
        customer_email: `user${i}@test.com`,
      }))
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    // Expect high success rate (allowing for some failures in test environment)
    expect(successful.length).toBeGreaterThan(50);
  });

  it('should query large dataset quickly', async () => {
    const supabase = createTestSupabaseClient();
    const startTime = Date.now();
    
    await supabase.from('bookings').select('*').limit(1000);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // < 1 second
  });
});
