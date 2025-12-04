
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface AvailabilityStepProps {
  data: any;
  updateData: (updates: any) => void;
}

const days = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

export const AvailabilityStep: React.FC<AvailabilityStepProps> = ({ data, updateData }) => {
  const updateAvailability = (day: string, field: string, value: string | boolean | null) => {
    updateData({
      availability: {
        ...data.availability,
        [day]: field === 'enabled' 
          ? value 
            ? { start: '09:00', end: '17:00' }
            : null
          : data.availability[day] 
            ? { ...data.availability[day], [field]: value }
            : null
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Availability
        </h3>
        <p className="text-gray-600">
          Set your default opening hours. You can adjust specific times per day later.
        </p>
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.key} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">{day.label}</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Closed</span>
                <Switch
                  checked={data.availability[day.key] !== null}
                  onCheckedChange={(checked) => updateAvailability(day.key, 'enabled', checked)}
                />
                <span className="text-sm text-gray-600">Open</span>
              </div>
            </div>
            
            {data.availability[day.key] && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`${day.key}-start`} className="text-sm">From</Label>
                  <Input
                    id={`${day.key}-start`}
                    type="time"
                    value={data.availability[day.key]?.start || '09:00'}
                    onChange={(e) => updateAvailability(day.key, 'start', e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${day.key}-end`} className="text-sm">To</Label>
                  <Input
                    id={`${day.key}-end`}
                    type="time"
                    value={data.availability[day.key]?.end || '17:00'}
                    onChange={(e) => updateAvailability(day.key, 'end', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> These are your default opening hours. After registration, you can set 
          specific times per day, add holidays, and create more advanced availability rules in your settings.
        </p>
      </div>
    </div>
  );
};
