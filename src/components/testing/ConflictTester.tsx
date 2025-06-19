
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Play, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, addHours } from 'date-fns';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
  timestamp: Date;
}

interface ConflictTesterProps {
  onTestResult: (result: TestResult) => void;
}

export function ConflictTester({ onTestResult }: ConflictTesterProps) {
  const [testing, setTesting] = useState(false);
  const [conflictScenarios, setConflictScenarios] = useState<any[]>([]);

  const testDoubleBooking = async () => {
    setTesting(true);
    
    try {
      const testTime = addHours(addDays(new Date(), 1), 10); // Tomorrow at 10:00
      
      // Try to create two bookings at the same time
      const booking1 = {
        calendar_id: '11111111-1111-1111-1111-111111111111',
        service_type_id: 'a1111111-1111-1111-1111-111111111111',
        customer_name: 'Test Customer 1',
        customer_email: 'test1@example.com',
        start_time: testTime.toISOString(),
        end_time: addHours(testTime, 1).toISOString(),
        status: 'confirmed'
      };

      const booking2 = {
        ...booking1,
        customer_name: 'Test Customer 2',
        customer_email: 'test2@example.com'
      };

      // First booking should succeed
      const { error: error1 } = await supabase
        .from('bookings')
        .insert([booking1]);

      if (error1) {
        onTestResult({
          name: 'Double Booking Test - First Booking',
          status: 'failed',
          message: `First booking failed: ${error1.message}`,
          timestamp: new Date()
        });
        return;
      }

      // Second booking should fail due to conflict
      const { error: error2 } = await supabase
        .from('bookings')
        .insert([booking2]);

      if (error2) {
        onTestResult({
          name: 'Double Booking Prevention',
          status: 'passed',
          message: 'Conflict correctly detected and prevented',
          timestamp: new Date()
        });
      } else {
        onTestResult({
          name: 'Double Booking Prevention',
          status: 'failed',
          message: 'System allowed conflicting booking!',
          timestamp: new Date()
        });
      }

    } catch (error) {
      onTestResult({
        name: 'Double Booking Test',
        status: 'failed',
        message: `Test error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const testOverlappingBookings = async () => {
    setTesting(true);
    
    try {
      const baseTime = addHours(addDays(new Date(), 2), 14); // Day after tomorrow at 2 PM
      
      const scenarios = [
        {
          name: 'Partial Overlap Start',
          booking1: { start: baseTime, duration: 60 },
          booking2: { start: addHours(baseTime, 0.5), duration: 60 }, // Starts 30min into first
          shouldConflict: true
        },
        {
          name: 'Partial Overlap End', 
          booking1: { start: baseTime, duration: 60 },
          booking2: { start: addHours(baseTime, -0.5), duration: 60 }, // Ends 30min into first
          shouldConflict: true
        },
        {
          name: 'Complete Overlap',
          booking1: { start: baseTime, duration: 60 },
          booking2: { start: addHours(baseTime, 0.25), duration: 30 }, // Completely inside first
          shouldConflict: true
        },
        {
          name: 'Adjacent Bookings',
          booking1: { start: baseTime, duration: 60 },
          booking2: { start: addHours(baseTime, 1), duration: 30 }, // Starts exactly when first ends
          shouldConflict: false
        }
      ];

      for (const scenario of scenarios) {
        const booking1 = {
          calendar_id: '22222222-2222-2222-2222-222222222222',
          service_type_id: 'b1111111-1111-1111-1111-111111111111',
          customer_name: 'Overlap Test 1',
          customer_email: 'overlap1@example.com',
          start_time: scenario.booking1.start.toISOString(),
          end_time: addHours(scenario.booking1.start, scenario.booking1.duration / 60).toISOString(),
          status: 'confirmed'
        };

        const booking2 = {
          calendar_id: '22222222-2222-2222-2222-222222222222',
          service_type_id: 'b1111111-1111-1111-1111-111111111111',
          customer_name: 'Overlap Test 2',
          customer_email: 'overlap2@example.com',
          start_time: scenario.booking2.start.toISOString(),
          end_time: addHours(scenario.booking2.start, scenario.booking2.duration / 60).toISOString(),
          status: 'confirmed'
        };

        // Create first booking
        const { error: error1 } = await supabase
          .from('bookings')
          .insert([booking1]);

        if (error1) continue;

        // Try second booking
        const { error: error2 } = await supabase
          .from('bookings')
          .insert([booking2]);

        const conflictDetected = !!error2;
        const testPassed = conflictDetected === scenario.shouldConflict;

        onTestResult({
          name: `Overlap Test: ${scenario.name}`,
          status: testPassed ? 'passed' : 'failed',
          message: testPassed 
            ? `Correctly ${conflictDetected ? 'detected' : 'allowed'} booking`
            : `Expected ${scenario.shouldConflict ? 'conflict' : 'no conflict'}, got ${conflictDetected ? 'conflict' : 'no conflict'}`,
          timestamp: new Date()
        });
      }

    } catch (error) {
      onTestResult({
        name: 'Overlapping Bookings Test',
        status: 'failed',
        message: `Test error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const testBufferTimeConflicts = async () => {
    setTesting(true);
    
    try {
      // Test bookings with preparation and cleanup time
      const baseTime = addHours(addDays(new Date(), 3), 11);
      
      const booking1 = {
        calendar_id: '11111111-1111-1111-1111-111111111111',
        service_type_id: 'a2222222-2222-2222-2222-222222222222', // Has 10min prep, 15min cleanup
        customer_name: 'Buffer Test 1',
        customer_email: 'buffer1@example.com',
        start_time: baseTime.toISOString(),
        end_time: addHours(baseTime, 2).toISOString(), // 2 hour service
        status: 'confirmed'
      };

      const booking2 = {
        calendar_id: '11111111-1111-1111-1111-111111111111',
        service_type_id: 'a1111111-1111-1111-1111-111111111111',
        customer_name: 'Buffer Test 2',
        customer_email: 'buffer2@example.com',
        start_time: addHours(baseTime, 2).toISOString(), // Exactly when first ends
        end_time: addHours(baseTime, 2.75).toISOString(),
        status: 'confirmed'
      };

      // First booking
      const { error: error1 } = await supabase
        .from('bookings')
        .insert([booking1]);

      if (error1) {
        onTestResult({
          name: 'Buffer Time Test',
          status: 'failed',
          message: `First booking failed: ${error1.message}`,
          timestamp: new Date()
        });
        return;
      }

      // Second booking should conflict due to cleanup time
      const { error: error2 } = await supabase
        .from('bookings')
        .insert([booking2]);

      onTestResult({
        name: 'Buffer Time Conflict Detection',
        status: error2 ? 'passed' : 'failed',
        message: error2 
          ? 'Buffer time conflict correctly detected'
          : 'Buffer time conflict not detected - system may not account for prep/cleanup time',
        timestamp: new Date()
      });

    } catch (error) {
      onTestResult({
        name: 'Buffer Time Test',
        status: 'failed',
        message: `Test error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const runAllConflictTests = async () => {
    await testDoubleBooking();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testOverlappingBookings();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testBufferTimeConflicts();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Booking Conflict Tests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 flex-wrap">
          <Button onClick={runAllConflictTests} disabled={testing}>
            <Play className="h-4 w-4 mr-2" />
            Run All Conflict Tests
          </Button>
          
          <Button variant="outline" onClick={testDoubleBooking} disabled={testing}>
            Test Double Booking
          </Button>
          
          <Button variant="outline" onClick={testOverlappingBookings} disabled={testing}>
            Test Overlapping Bookings
          </Button>
          
          <Button variant="outline" onClick={testBufferTimeConflicts} disabled={testing}>
            Test Buffer Time Conflicts
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Exact Time Conflict</Badge>
                <span className="text-sm">Same start/end times</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Partial Overlap</Badge>
                <span className="text-sm">Bookings overlap partially</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Complete Overlap</Badge>
                <span className="text-sm">One booking inside another</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Buffer Time</Badge>
                <span className="text-sm">Prep/cleanup time conflicts</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Adjacent Bookings</Badge>
                <span className="text-sm">Back-to-back scheduling</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expected Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✅ System should prevent conflicting bookings</p>
              <p>✅ Error messages should be user-friendly</p>
              <p>✅ Buffer times should be respected</p>
              <p>✅ Adjacent bookings should be allowed</p>
              <p>✅ Database constraints should enforce rules</p>
            </CardContent>
          </Card>
        </div>

        {testing && (
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Running conflict tests...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
