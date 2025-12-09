import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Edit2, Check, X } from 'lucide-react';
import { COMPREHENSIVE_TIMEZONES } from './TimezoneData';

interface TimezoneDisplayProps {
  currentTimezone: string;
  onTimezoneChange: (timezone: string) => Promise<void>;
}

export const TimezoneDisplay: React.FC<TimezoneDisplayProps> = ({
  currentTimezone,
  onTimezoneChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);
  const [isSaving, setIsSaving] = useState(false);

  const currentTimezoneLabel = COMPREHENSIVE_TIMEZONES.find(tz => tz.value === currentTimezone)?.label || currentTimezone;
  
  const getCurrentTime = () => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: currentTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
    } catch {
      return '00:00';
    }
  };

  const handleSave = async () => {
    if (selectedTimezone === currentTimezone) {
      console.log('🌍 TimezoneDisplay: No change needed, closing edit mode');
      setIsEditing(false);
      return;
    }

    console.log(`🔥 TimezoneDisplay: MANUAL EDIT - Saving timezone change from ${currentTimezone} to ${selectedTimezone}`);

    try {
      setIsSaving(true);
      
      // Call parent function - it handles all verification
      await onTimezoneChange(selectedTimezone);
      
      // ONLY close edit mode if save was successful
      setIsEditing(false);
      console.log('✅ TimezoneDisplay: Manual timezone change successful');
      
    } catch (error) {
      console.error('💥 TimezoneDisplay: Manual timezone change FAILED:', error);
      
      // Revert selection on failure
      setSelectedTimezone(currentTimezone);
      
      // Keep edit mode open so user can try again
      console.log('🔄 TimezoneDisplay: Keeping edit mode open for retry');
      
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedTimezone(currentTimezone);
    setIsEditing(false);
  };

  return (
    <Card className="bg-card/90 backdrop-blur-sm border border-border/60 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Timezone</span>
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current timezone</div>
              <div className="font-medium text-foreground">
                {currentTimezoneLabel}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Local time</div>
              <div className="font-mono text-lg font-semibold text-primary">
                {getCurrentTime()}
              </div>
            </div>
            
            <div className="pt-2 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                All availability times are shown in this timezone
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Select timezone</div>
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPREHENSIVE_TIMEZONES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-2">Save</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};