import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calculator, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxExportSectionProps {
  accountId?: string;
  calendarId?: string;
}

export const TaxExportSection: React.FC<TaxExportSectionProps> = ({ 
  accountId, 
  calendarId 
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleExport = async () => {
    if (!accountId) {
      toast({
        title: "Error",
        description: "No Stripe account connected",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-tax-report', {
        body: {
          calendar_id: calendarId,
          quarter: selectedQuarter,
          year: selectedYear,
          test_mode: true,
          format: 'csv'
        }
      });

      if (error) throw error;

      // Create and download the CSV file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tax-report-Q${selectedQuarter}-${selectedYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Tax report for Q${selectedQuarter} ${selectedYear} has been downloaded`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not generate tax report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to export tax reports</p>
        </CardContent>
      </Card>
    );
  }

  const getQuarterName = (quarter: number) => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters[quarter - 1] || 'Q1';
  };

  const getQuarterPeriod = (quarter: number, year: number) => {
    const months = [
      ['Jan', 'Feb', 'Mar'],
      ['Apr', 'May', 'Jun'],
      ['Jul', 'Aug', 'Sep'],
      ['Oct', 'Nov', 'Dec']
    ];
    return months[quarter - 1]?.join('-') || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Download className="w-5 h-5 text-primary" />
          Export Tax Report
        </CardTitle>
        <CardDescription>
          Download quarterly tax data for your accountant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Quarter</label>
            <Select
              value={selectedQuarter.toString()}
              onValueChange={(value) => setSelectedQuarter(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Year</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-medium mb-1">What's included in your report:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All transactions for {getQuarterName(selectedQuarter)} {selectedYear} ({getQuarterPeriod(selectedQuarter, selectedYear)})</li>
                <li>• Customer details, service types, and booking dates</li>
                <li>• Gross revenue, VAT amounts, and net revenue</li>
                <li>• Ready for import into accounting software</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleExport}
          disabled={isExporting}
          size="lg"
          className="w-full"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Tax Report for Accountant
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            CSV format • Compatible with Excel, QuickBooks, and most accounting software
          </p>
        </div>
      </CardContent>
    </Card>
  );
};