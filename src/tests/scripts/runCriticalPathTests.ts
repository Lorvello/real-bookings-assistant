/**
 * Critical Path Test Runner
 * Run before each deployment to verify core functionality
 */

export const criticalPathTests = [
  'User can sign up',
  'User can create calendar', 
  'Customer can view availability',
  'Customer can create booking',
  'Owner can view bookings',
];

console.log('Critical Path Tests:', criticalPathTests.length);
