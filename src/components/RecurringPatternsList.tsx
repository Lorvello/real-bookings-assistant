
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
    const { pattern_type, schedule_data } = pattern;
    
    switch (pattern_type) {
      case 'weekly':
        return `${formatDays(schedule_data.days)} • ${formatTimeSlots(schedule_data.time_slots)}`;
      
      case 'biweekly':
        const week1 = formatDays(schedule_data.week1_days);
        const week2 = formatDays(schedule_data.week2_days);
        return `Week 1: ${week1} • Week 2: ${week2}`;
      
      case 'monthly':
        const occurrence = schedule_data.occurrence === 'first' ? 'Eerste' : 'Laatste';
        return `${occurrence} week • ${formatDays(schedule_data.days)}`;
      
      case 'seasonal':
        const months = ['', 'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
        const startMonth = months[schedule_data.start_month];
        const endMonth = months[schedule_data.end_month];
        return `${startMonth} - ${endMonth} • ${formatDays(schedule_data.days)}`;
      
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
              Nog geen terugkerende patronen
            </h3>
            <p className="text-muted-foreground">
              Maak een terugkerend beschikbaarheidspatroon om je planning te automatiseren
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
                        Actief
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Pause className="h-3 w-3 mr-1" />
                        Gepauzeerd
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
                      <AlertDialogTitle>Patroon verwijderen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je "{pattern.pattern_name}" wilt verwijderen? 
                        Deze actie kan niet ongedaan worden gemaakt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeletePattern(pattern.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Verwijderen
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
                    Eind: {format(new Date(pattern.end_date), 'd MMM yyyy', { locale: nl })}
                  </span>
                )}
                <span>
                  Aangemaakt: {format(new Date(pattern.created_at), 'd MMM yyyy', { locale: nl })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
