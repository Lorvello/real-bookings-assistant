
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LimitsProps {
  onChange: () => void;
}

export const Limits: React.FC<LimitsProps> = ({ onChange }) => {
  const [settings, setSettings] = useState({
    beforeEvent: '15',
    afterEvent: '15',
    minimumNoticeValue: '2',
    minimumNoticeUnit: 'Hours',
    timeSlotIntervals: 'Use event length (default)',
    limitBookingFrequency: false,
    onlyShowFirstSlot: false,
    limitTotalDuration: false,
    bookerActiveLimit: false,
    limitFutureBookings: false
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onChange();
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg space-y-6">
      {/* Before/After Event Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-white font-medium">Before event</Label>
          <Select 
            value={settings.beforeEvent} 
            onValueChange={(value) => updateSetting('beforeEvent', value)}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="5">5 Minutes</SelectItem>
              <SelectItem value="10">10 Minutes</SelectItem>
              <SelectItem value="15">15 Minutes</SelectItem>
              <SelectItem value="30">30 Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-white font-medium">After event</Label>
          <Select 
            value={settings.afterEvent} 
            onValueChange={(value) => updateSetting('afterEvent', value)}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="5">5 Minutes</SelectItem>
              <SelectItem value="10">10 Minutes</SelectItem>
              <SelectItem value="15">15 Minutes</SelectItem>
              <SelectItem value="30">30 Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Minimum Notice Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-white font-medium">Minimum Notice</Label>
          <div className="flex gap-3">
            <Input
              type="number"
              value={settings.minimumNoticeValue}
              onChange={(e) => updateSetting('minimumNoticeValue', e.target.value)}
              className="bg-gray-800 border-gray-700 text-white flex-1"
            />
            <Select 
              value={settings.minimumNoticeUnit} 
              onValueChange={(value) => updateSetting('minimumNoticeUnit', value)}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="Minutes">Minutes</SelectItem>
                <SelectItem value="Hours">Hours</SelectItem>
                <SelectItem value="Days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-white font-medium">Time-slot intervals</Label>
          <Select 
            value={settings.timeSlotIntervals} 
            onValueChange={(value) => updateSetting('timeSlotIntervals', value)}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="Use event length (default)">Use event length (default)</SelectItem>
              <SelectItem value="15 minutes">15 minutes</SelectItem>
              <SelectItem value="30 minutes">30 minutes</SelectItem>
              <SelectItem value="60 minutes">60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggle Sections */}
      <div className="space-y-6 pt-4">
        {/* Limit booking frequency */}
        <div className="flex items-start justify-between p-4 border border-gray-700 rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="text-white font-medium">Limit booking frequency</div>
            <div className="text-gray-400 text-sm">Limit how many times this event can be booked</div>
          </div>
          <Switch
            checked={settings.limitBookingFrequency}
            onCheckedChange={(checked) => updateSetting('limitBookingFrequency', checked)}
            className="ml-4"
          />
        </div>

        {/* Only show first slot */}
        <div className="flex items-start justify-between p-4 border border-gray-700 rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="text-white font-medium">Only show the first slot of each day as available</div>
            <div className="text-gray-400 text-sm">This will limit your availability for this event type to one slot per day, scheduled at the earliest available time.</div>
          </div>
          <Switch
            checked={settings.onlyShowFirstSlot}
            onCheckedChange={(checked) => updateSetting('onlyShowFirstSlot', checked)}
            className="ml-4"
          />
        </div>

        {/* Limit total booking duration */}
        <div className="flex items-start justify-between p-4 border border-gray-700 rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="text-white font-medium">Limit total booking duration</div>
            <div className="text-gray-400 text-sm">Limit total amount of time that this event can be booked</div>
          </div>
          <Switch
            checked={settings.limitTotalDuration}
            onCheckedChange={(checked) => updateSetting('limitTotalDuration', checked)}
            className="ml-4"
          />
        </div>

        {/* Booker active booking limit */}
        <div className="flex items-start justify-between p-4 border border-gray-700 rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="text-white font-medium">Booker active booking limit</div>
            <div className="text-gray-400 text-sm">Limit the number of active bookings a booker can make for this event type</div>
          </div>
          <Switch
            checked={settings.bookerActiveLimit}
            onCheckedChange={(checked) => updateSetting('bookerActiveLimit', checked)}
            className="ml-4"
          />
        </div>

        {/* Limit future bookings */}
        <div className="flex items-start justify-between p-4 border border-gray-700 rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="text-white font-medium">Limit future bookings</div>
            <div className="text-gray-400 text-sm">Limit how far in the future this event can be booked</div>
          </div>
          <Switch
            checked={settings.limitFutureBookings}
            onCheckedChange={(checked) => updateSetting('limitFutureBookings', checked)}
            className="ml-4"
          />
        </div>
      </div>
    </div>
  );
};
