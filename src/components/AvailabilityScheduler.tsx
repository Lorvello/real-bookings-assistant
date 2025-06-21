
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Calendar,
  Clock,
  Save,
  MoreVertical,
  GripVertical,
  Edit
} from 'lucide-react';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';
import { AvailabilityRule } from '@/types/database';
import { WeekScheduleView } from './WeekScheduleView';
import { ScheduleTemplates } from './ScheduleTemplates';
import { TimeBlockEditor } from './TimeBlockEditor';

interface AvailabilitySchedulerProps {
  calendarId: string;
}

const DAYS_OF_WEEK = [
  { key: 1, label: 'Maandag', short: 'Ma' },
  { key: 2, label: 'Dinsdag', short: 'Di' },
  { key: 3, label: 'Woensdag', short: 'Wo' },
  { key: 4, label: 'Donderdag', short: 'Do' },
  { key: 5, label: 'Vrijdag', short: 'Vr' },
  { key: 6, label: 'Zaterdag', short: 'Za' },
  { key: 0, label: 'Zondag', short: 'Zo' },
];

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
            {/* Schedule Selector */}
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger className="w-48 bg-input border-border">
                <SelectValue placeholder="Selecteer schema" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    <div className="flex items-center">
                      {schedule.name}
                      {schedule.is_default && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Standaard
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week Actions */}
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWeek}
                className="border-border"
              >
                <Copy className="h-4 w-4 mr-1" />
                Kopieer Week
              </Button>
              
              {copiedWeek.length > 0 && (
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handlePasteWeek}
                  className="border-border"
                >
                  Plak Week
                </Button>
              )}
            </div>
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
            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Bulk Bewerkingen
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleBulkUpdate({ is_available: true })}
                  className="border-border"
                >
                  Alle dagen beschikbaar maken
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleBulkUpdate({ is_available: false })}
                  className="border-border"
                >
                  Alle dagen niet beschikbaar maken
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleBulkUpdate({ 
                    start_time: '09:00', 
                    end_time: '17:00' 
                  })}
                  className="border-border"
                >
                  Standaard werkuren (9:00-17:00)
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleBulkUpdate({ 
                    start_time: '08:00', 
                    end_time: '18:00' 
                  })}
                  className="border-border"
                >
                  Lange werkuren (8:00-18:00)
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
