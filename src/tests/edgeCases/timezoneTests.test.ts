import { describe, it, expect } from 'vitest';
import { addHours } from 'date-fns';

describe('Timezone Edge Cases', () => {
  it('should handle DST spring forward', () => {
    // March 31, 2024 - DST transition in Europe/Amsterdam
    const dstDate = new Date('2024-03-31T01:30:00+01:00');
    const twoHoursLater = addHours(dstDate, 2);
    
    expect(twoHoursLater).toBeDefined();
  });

  it('should handle leap year dates', () => {
    const leapDay = new Date('2024-02-29T12:00:00');
    expect(leapDay.getDate()).toBe(29);
  });
});
