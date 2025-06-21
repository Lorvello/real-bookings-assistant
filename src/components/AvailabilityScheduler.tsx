
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { AvailabilityRule } from '@/types/database';
import { WeekScheduleView } from './WeekScheduleView';
import { ScheduleTemplates } from './ScheduleTemplates';
import { ScheduleSelector } from './availability/ScheduleSelector';
import { WeekActions } from './availability/WeekActions';
import { BulkActions } from './availability/BulkActions';

interface AvailabilitySchedulerProps {
  calendarId: string;
}

export function AvailabilityScheduler({ calendarId }: AvailabilitySchedulerProps) {
  const { schedules, loading: schedulesLoading, createSchedule } = useAvailabilitySchedules(calendarId);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const { rules, loading: rulesLoading, createRule, updateRule, deleteRule } = useAvailabilityRules(selectedScheduleId);
  const [activeTab, setActiveTab] = useState('visual');
  const [copiedWeek, setCopiedWeek] = useState<AvailabilityRule[]>([]);

  // Set default schedule when schedules load
  useEffect(() => {
    if (schedules.length > 0 && !selectedScheduleId) {
      const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
      setSelectedScheduleId(defaultSchedule.id);
    }
  }, [schedules, selectedScheduleId]);

  const handleCreateSchedule = async (name: string) => {
    await createSchedule({ name, is_default: false });
  };

  const handleCopyWeek = () => {
    setCopiedWeek([...rules]);
  };

  const handlePasteWeek = async () => {
    if (copiedWeek.length === 0) return;
    
    // Clear existing rules and add copied ones
    for (const rule of rules) {
      await deleteRule(rule.id);
    }
    
    for (const copiedRule of copiedWeek) {
      await createRule({
        day_of_week: copiedRule.day_of_week,
        start_time: copiedRule.start_time,
        end_time: copiedRule.end_time,
        is_available: copiedRule.is_available
      });
    }
  };

  const handleBulkUpdate = async (updates: Partial<AvailabilityRule>) => {
    for (const rule of rules) {
      await updateRule(rule.id, updates);
    }
  };

  // Wrapper functions to convert return types for WeekScheduleView compatibility
  const handleRuleUpdate = async (id: string, updates: Partial<AvailabilityRule>): Promise<void> => {
    await updateRule(id, updates);
  };

  const handleRuleCreate = async (rule: Partial<AvailabilityRule>): Promise<void> => {
    await createRule(rule);
  };

  const handleRuleDelete = async (id: string): Promise<void> => {
    await deleteRule(id);
  };

  if (schedulesLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Beschikbaarheid Schema
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <ScheduleSelector
              schedules={schedules}
              selectedScheduleId={selectedScheduleId}
              onScheduleChange={setSelectedScheduleId}
            />

            <WeekActions
              onCopyWeek={handleCopyWeek}
              onPasteWeek={handlePasteWeek}
              hasCopiedWeek={copiedWeek.length > 0}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="visual">Visuele Planner</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Bewerken</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            <WeekScheduleView
              calendarId={calendarId}
              scheduleId={selectedScheduleId}
              rules={rules}
              onRuleUpdate={handleRuleUpdate}
              onRuleCreate={handleRuleCreate}
              onRuleDelete={handleRuleDelete}
              loading={rulesLoading}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <ScheduleTemplates
              calendarId={calendarId}
              schedules={schedules}
              onScheduleCreate={handleCreateSchedule}
              selectedScheduleId={selectedScheduleId}
            />
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            <BulkActions onBulkUpdate={handleBulkUpdate} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
