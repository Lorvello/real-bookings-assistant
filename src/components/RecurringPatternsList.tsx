
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Calendar,
  Clock,
  CalendarDays,
  Sun,
  Repeat,
  Trash2,
  Edit,
  Play,
  Pause
} from 'lucide-react';
import { RecurringPattern } from '@/hooks/useRecurringPatterns';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface RecurringPatternsListProps {
  patterns: RecurringPattern[];
  onTogglePattern: (id: string, isActive: boolean) => Promise<void>;
  onDeletePattern: (id: string) => Promise<void>;
  loading: boolean;
}

const DAYS_OF_WEEK = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

// Type guard to safely access schedule_data properties
interface ScheduleData {
  days?: string[];
  time_slots?: { start: string; end: string }[];
  week1_days?: string[];
  week2_days?: string[];
  occurrence?: 'first' | 'last';
  start_month?: number;
  end_month?: number;
}

export function RecurringPatternsList({ 
  patterns, 
  onTogglePattern, 
  onDeletePattern, 
  loading 
}: RecurringPatternsListProps) {
  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'weekly': return <Repeat className="h-4 w-4" />;
      case 'biweekly': return <CalendarDays className="h-4 w-4" />;
      case 'monthly': return <Calendar className="h-4 w-4" />;
      case 'seasonal': return <Sun className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPatternTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return 'Wekelijks';
      case 'biweekly': return 'Tweewekelijks';
      case 'monthly': return 'Maandelijks';
      case 'seasonal': return 'Seizoensgebonden';
      default: return type;
    }
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return '';
    return days.map(day => DAYS_OF_WEEK[parseInt(day)]).join(', ');
  };

  const formatTimeSlots = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return '';
    return timeSlots.map(slot => `${slot.start}-${slot.end}`).join(', ');
  };

  const getPatternDescription = (pattern: RecurringPattern) => {
    const { pattern_type } = pattern;
    const scheduleData = pattern.schedule_data as ScheduleData;
    
    switch (pattern_type) {
      case 'weekly':
        return `${formatDays(scheduleData.days || [])} • ${formatTimeSlots(scheduleData.time_slots || [])}`;
      
      case 'biweekly':
        const week1 = formatDays(scheduleData.week1_days || []);
        const week2 = formatDays(scheduleData.week2_days || []);
        return `Week 1: ${week1} • Week 2: ${week2}`;
      
      case 'monthly':
        const occurrence = scheduleData.occurrence === 'first' ? 'Eerste' : 'Laatste';
        return `${occurrence} week • ${formatDays(scheduleData.days || [])}`;
      
      case 'seasonal':
        const months = ['', 'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
        const startMonth = months[scheduleData.start_month || 1];
        const endMonth = months[scheduleData.end_month || 12];
        return `${startMonth} - ${endMonth} • ${formatDays(scheduleData.days || [])}`;
      
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 bg-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No recurring patterns yet
            </h3>
            <p className="text-muted-foreground">
              Create a recurring availability pattern to automate your scheduling
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {patterns.map((pattern) => (
        <Card key={pattern.id} className={pattern.is_active ? 'border-primary/20' : 'border-border'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  pattern.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getPatternIcon(pattern.pattern_type)}
                </div>
                
                <div>
                  <CardTitle className="text-lg">{pattern.pattern_name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getPatternTypeLabel(pattern.pattern_type)}
                    </Badge>
                    {pattern.is_active ? (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <Play className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Pause className="h-3 w-3 mr-1" />
                        Paused
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={pattern.is_active}
                  onCheckedChange={(checked) => onTogglePattern(pattern.id, checked)}
                />
                
                <Button variant="ghost" size="sm" disabled>
                  <Edit className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                       <AlertDialogTitle>Delete pattern?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{pattern.pattern_name}"? 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeletePattern(pattern.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {getPatternDescription(pattern)}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>
                  Start: {format(new Date(pattern.start_date), 'd MMM yyyy', { locale: nl })}
                </span>
                {pattern.end_date && (
                  <span>
                    End: {format(new Date(pattern.end_date), 'd MMM yyyy', { locale: nl })}
                  </span>
                )}
                <span>
                  Created: {format(new Date(pattern.created_at), 'd MMM yyyy', { locale: nl })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
