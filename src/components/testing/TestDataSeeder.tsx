import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Play, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
  timestamp: Date;
}

interface TestDataSeederProps {
  onTestResult: (result: TestResult) => void;
}

export function TestDataSeeder({ onTestResult }: TestDataSeederProps) {
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { user } = useAuth();

  const seedTestCalendars = async () => {
    if (!user) {
      onTestResult({
        name: 'Seed Test Calendars',
        status: 'failed',
        message: 'User must be authenticated to seed data',
        timestamp: new Date()
      });
      return;
    }

    setSeeding(true);

    try {
      const testCalendars = [
        {
          name: 'Test Beauty Salon',
          slug: `test-beauty-${Date.now()}`,
          description: 'Test salon voor booking tests',
          color: '#FF6B9D',
          business_type: 'salon'
        },
        {
          name: 'Test Medical Clinic', 
          slug: `test-clinic-${Date.now()}`,
          description: 'Test clinic voor medische afspraken',
          color: '#4ECDC4',
          business_type: 'clinic'
        },
        {
          name: 'Test Consultancy',
          slug: `test-consultant-${Date.now()}`,
          description: 'Test consultancy voor zakelijke afspraken',
          color: '#45B7D1',
          business_type: 'consultant'
        }
      ];

      for (const calendar of testCalendars) {
        const { data, error } = await supabase
          .from('calendars')
          .insert([{
            ...calendar,
            user_id: user.id
          }])
          .select()
          .single();

        if (error) {
          onTestResult({
            name: `Seed Calendar: ${calendar.name}`,
            status: 'failed',
            message: error.message,
            timestamp: new Date()
          });
          continue;
        }

        // Add test service types for this calendar
        const serviceTypes = [
          {
            calendar_id: data.id,
            name: 'Test Service 1',
            duration: 30,
            price: 50.00,
            color: calendar.color,
            description: 'Eerste test service'
          },
          {
            calendar_id: data.id,
            name: 'Test Service 2', 
            duration: 60,
            price: 100.00,
            color: calendar.color,
            description: 'Tweede test service'
          }
        ];

        const { error: serviceError } = await supabase
          .from('service_types')
          .insert(serviceTypes);

        if (serviceError) {
          onTestResult({
            name: `Seed Services for ${calendar.name}`,
            status: 'failed',
            message: serviceError.message,
            timestamp: new Date()
          });
        } else {
          onTestResult({
            name: `Seed Calendar: ${calendar.name}`,
            status: 'passed',
            message: `Calendar and services created successfully`,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      onTestResult({
        name: 'Seed Test Data',
        status: 'failed',
        message: `Seeding error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setSeeding(false);
    }
  };

  const seedTestBookings = async () => {
    if (!user) return;

    setSeeding(true);

    try {
      // Get user's calendars
      const { data: calendars } = await supabase
        .from('calendars')
        .select('id, service_types(id)')
        .eq('user_id', user.id)
        .limit(1);

      if (!calendars || calendars.length === 0) {
        onTestResult({
          name: 'Seed Test Bookings',
          status: 'failed',
          message: 'No calendars found. Create test calendars first.',
          timestamp: new Date()
        });
        return;
      }

      const calendar = calendars[0];
      const serviceTypeId = calendar.service_types?.[0]?.id;

      if (!serviceTypeId) {
        onTestResult({
          name: 'Seed Test Bookings',
          status: 'failed',
          message: 'No service types found for calendar',
          timestamp: new Date()
        });
        return;
      }

      const testBookings = [
        {
          calendar_id: calendar.id,
          service_type_id: serviceTypeId,
          customer_name: 'Test Customer 1',
          customer_email: 'test1@example.com',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // +30min
          status: 'confirmed'
        },
        {
          calendar_id: calendar.id,
          service_type_id: serviceTypeId,
          customer_name: 'Test Customer 2',
          customer_email: 'test2@example.com',
          start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          end_time: new Date(Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1 hour
          status: 'pending'
        }
      ];

      const { error } = await supabase
        .from('bookings')
        .insert(testBookings);

      if (error) {
        onTestResult({
          name: 'Seed Test Bookings',
          status: 'failed',
          message: error.message,
          timestamp: new Date()
        });
      } else {
        onTestResult({
          name: 'Seed Test Bookings',
          status: 'passed',
          message: `Created ${testBookings.length} test bookings`,
          timestamp: new Date()
        });
      }

    } catch (error) {
      onTestResult({
        name: 'Seed Test Bookings',
        status: 'failed',
        message: `Booking seeding error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setSeeding(false);
    }
  };

  const cleanupTestData = async () => {
    if (!user) return;

    setCleaning(true);

    try {
      // First get the calendar IDs that match our test pattern
      const { data: testCalendars } = await supabase
        .from('calendars')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', '%test%');

      if (!testCalendars || testCalendars.length === 0) {
        onTestResult({
          name: 'Cleanup Test Data',
          status: 'passed',
          message: 'No test data found to cleanup',
          timestamp: new Date()
        });
        setCleaning(false);
        return;
      }

      const calendarIds = testCalendars.map(cal => cal.id);

      // Clean up in proper order (foreign key constraints)
      // 1. Clean up bookings first
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .in('calendar_id', calendarIds);

      // 2. Clean up service types
      const { error: serviceError } = await supabase
        .from('service_types')
        .delete()
        .in('calendar_id', calendarIds);

      // 3. Clean up calendar settings
      const { error: settingsError } = await supabase
        .from('calendar_settings')
        .delete()
        .in('calendar_id', calendarIds);

      // 4. Clean up availability schedules and rules
      const { data: schedules } = await supabase
        .from('availability_schedules')
        .select('id')
        .in('calendar_id', calendarIds);

      if (schedules && schedules.length > 0) {
        const scheduleIds = schedules.map(s => s.id);
        await supabase
          .from('availability_rules')
          .delete()
          .in('schedule_id', scheduleIds);

        await supabase
          .from('availability_schedules')
          .delete()
          .in('calendar_id', calendarIds);
      }

      // 5. Clean up other related data
      await supabase
        .from('availability_overrides')
        .delete()
        .in('calendar_id', calendarIds);

      await supabase
        .from('waitlist')
        .delete()
        .in('calendar_id', calendarIds);

      await supabase
        .from('webhook_events')
        .delete()
        .in('calendar_id', calendarIds);

      await supabase
        .from('webhook_endpoints')
        .delete()
        .in('calendar_id', calendarIds);

      // 6. Finally clean up calendars
      const { error: calendarError } = await supabase
        .from('calendars')
        .delete()
        .in('id', calendarIds);

      if (bookingError || serviceError || settingsError || calendarError) {
        const errors = [bookingError, serviceError, settingsError, calendarError]
          .filter(Boolean)
          .map(e => e!.message);
        
        onTestResult({
          name: 'Cleanup Test Data',
          status: 'failed',
          message: `Cleanup errors: ${errors.join(', ')}`,
          timestamp: new Date()
        });
      } else {
        onTestResult({
          name: 'Cleanup Test Data',
          status: 'passed',
          message: 'Successfully cleaned up all test data',
          timestamp: new Date()
        });
      }

    } catch (error) {
      onTestResult({
        name: 'Cleanup Test Data',
        status: 'failed',
        message: `Cleanup error: ${error}`,
        timestamp: new Date()
      });
    } finally {
      setCleaning(false);
    }
  };

  const seedAllTestData = async () => {
    await seedTestCalendars();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await seedTestBookings();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!user && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800">
              Je moet ingelogd zijn om test data te kunnen aanmaken en beheren.
            </p>
          </div>
        )}

        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={seedAllTestData} 
            disabled={seeding || cleaning || !user}
          >
            {seeding ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Seed All Test Data
          </Button>
          
          <Button 
            variant="outline" 
            onClick={seedTestCalendars} 
            disabled={seeding || cleaning || !user}
          >
            <Database className="h-4 w-4 mr-2" />
            Seed Test Calendars
          </Button>
          
          <Button 
            variant="outline" 
            onClick={seedTestBookings} 
            disabled={seeding || cleaning || !user}
          >
            <Database className="h-4 w-4 mr-2" />
            Seed Test Bookings
          </Button>

          <Button 
            variant="destructive" 
            onClick={cleanupTestData} 
            disabled={seeding || cleaning || !user}
          >
            {cleaning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Cleanup Test Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Data Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Calendars</Badge>
                <span className="text-sm">Different business types</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Service Types</Badge>
                <span className="text-sm">Various durations & prices</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Bookings</Badge>
                <span className="text-sm">Different statuses & times</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Customers</Badge>
                <span className="text-sm">Realistic test profiles</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>📅 Future bookings for testing</p>
              <p>🔄 Different booking statuses</p>
              <p>⏰ Various time slots & durations</p>
              <p>💰 Different pricing models</p>
              <p>🏢 Multiple business types</p>
              <p>👥 Realistic customer data</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Safety Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>🔒 Only creates data for authenticated user</p>
            <p>🏷️ Test data clearly labeled for identification</p>
            <p>🧹 Easy cleanup of all test data</p>
            <p>🚫 No interference with production data</p>
            <p>📊 Feedback on seeding operations</p>
          </CardContent>
        </Card>

        {(seeding || cleaning) && (
          <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-800">
              {seeding ? 'Creating test data...' : 'Cleaning up test data...'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
