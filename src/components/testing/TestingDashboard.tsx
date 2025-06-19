
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingFlowTester } from './BookingFlowTester';
import { ConflictTester } from './ConflictTester';
import { TimezoneTester } from './TimezoneTester';
import { EdgeCaseTester } from './EdgeCaseTester';
import { TestDataSeeder } from './TestDataSeeder';
import { TestResults } from './TestResults';
import { Play, RefreshCw, Database, CheckCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  message: string;
  timestamp: Date;
}

export function TestingDashboard() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const tests = [
      'Booking Flow End-to-End',
      'Conflict Detection',
      'Timezone Handling',
      'Edge Cases',
      'Webhook Processing'
    ];

    for (const test of tests) {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const success = Math.random() > 0.3; // 70% success rate for demo
      addTestResult({
        name: test,
        status: success ? 'passed' : 'failed',
        message: success ? 'Test passed successfully' : 'Test failed - check implementation',
        timestamp: new Date()
      });
    }
    
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite voor booking systeem
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={isRunning}>
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run All Tests
          </Button>
          
          <Button variant="outline" onClick={clearResults}>
            Clear Results
          </Button>
        </div>
      </div>

      {/* Test Results Overview */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.status === 'passed').length}
                </div>
                <div className="text-sm text-green-700">Passed</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => r.status === 'failed').length}
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {testResults.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
            </div>
            
            <TestResults results={testResults} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="booking-flow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="booking-flow">Booking Flow</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="timezone">Timezone</TabsTrigger>
          <TabsTrigger value="edge-cases">Edge Cases</TabsTrigger>
          <TabsTrigger value="test-data">Test Data</TabsTrigger>
        </TabsList>

        <TabsContent value="booking-flow">
          <BookingFlowTester onTestResult={addTestResult} />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictTester onTestResult={addTestResult} />
        </TabsContent>

        <TabsContent value="timezone">
          <TimezoneTester onTestResult={addTestResult} />
        </TabsContent>

        <TabsContent value="edge-cases">
          <EdgeCaseTester onTestResult={addTestResult} />
        </TabsContent>

        <TabsContent value="test-data">
          <TestDataSeeder onTestResult={addTestResult} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
