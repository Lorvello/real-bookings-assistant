
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceTypeStripeConfig } from './ServiceTypeStripeConfig';
import { ServiceType } from '@/types/calendar';
import { Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TeamMemberSelector } from '@/components/service-types/TeamMemberSelector';
import { ServiceCalendarSelector } from './ServiceCalendarSelector';
import { Calendar as CalendarType } from '@/types/database';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  color: string;
  tax_enabled: boolean;
  tax_behavior: 'inclusive' | 'exclusive';
  tax_code: string;
}

interface ServiceTypeFormProps {
  formData: ServiceTypeFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServiceTypeFormData>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  taxConfigured?: boolean;
  userTaxBehavior?: string | null;
  onRefreshTaxStatus?: () => void;
  calendarId?: string;
  selectedTeamMembers?: string[];
  onTeamMembersChange?: (memberIds: string[]) => void;
  // New props for calendar selection
  calendars?: CalendarType[];
  selectedCalendarId?: string | null;
  onCalendarSelect?: (calendarId: string) => void;
  onCalendarCreated?: (calendar: CalendarType) => void;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

const TAX_CODE_OPTIONS = [
  { value: 'txcd_99999999', label: 'Professional Services' },
  { value: 'txcd_10401000', label: 'Digital Services' },
  { value: 'txcd_10000000', label: 'General Services' },
  { value: 'txcd_10103000', label: 'Software Services' },
  { value: 'txcd_10502001', label: 'Consulting Services' },
  { value: 'txcd_20030000', label: 'Educational Services' }
];

export function ServiceTypeForm({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  saving, 
  isEditing,
  taxConfigured = false,
  userTaxBehavior,
  onRefreshTaxStatus,
  calendarId,
  selectedTeamMembers = [],
  onTeamMembersChange,
  calendars = [],
  selectedCalendarId,
  onCalendarSelect,
  onCalendarCreated
}: ServiceTypeFormProps) {
  const navigate = useNavigate();
  const [showTaxBehaviorWarning, setShowTaxBehaviorWarning] = useState(false);
  const [previousTaxBehavior] = useState(formData.tax_behavior);

  // Validation function
  const isValidForm = () => {
    if (!formData.name.trim()) return false;
    
    // If tax is enabled, require tax_code and tax_behavior
    if (formData.tax_enabled) {
      if (!formData.tax_code || !formData.tax_behavior) {
        return false;
      }
    }
    
    return true;
  };

  // Handle tax behavior change with warning
  const handleTaxBehaviorChange = (newBehavior: 'inclusive' | 'exclusive') => {
    if (isEditing && previousTaxBehavior === 'inclusive' && newBehavior === 'exclusive') {
      setShowTaxBehaviorWarning(true);
    }
    setFormData(prev => ({ ...prev, tax_behavior: newBehavior }));
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Service Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="e.g. Haircut"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Duration (minutes) *
          </label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
            className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            min="1"
            placeholder="30"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Price (€)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Color
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color ? 'border-foreground scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-3 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            placeholder="Optional description of the service"
          />
        </div>
      </div>

      {/* Calendar Selection Section */}
      {calendars && calendars.length > 0 && onCalendarSelect && onCalendarCreated && (
        <ServiceCalendarSelector
          calendars={calendars}
          selectedCalendarId={selectedCalendarId || null}
          onCalendarSelect={onCalendarSelect}
          onCalendarCreated={onCalendarCreated}
          disabled={saving}
        />
      )}

      {/* Tax Configuration Section - Coming Soon */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Tax Configuration</h3>
          <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs px-2 py-1 rounded-full font-medium">
            Coming Soon
          </span>
        </div>
        
        <div className="opacity-50 pointer-events-none">
          <p className="text-sm text-muted-foreground mb-4">
            Tax configuration features are coming soon. You'll be able to configure tax behavior and tax codes for your services.
          </p>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-muted-foreground">
                Enable Tax for this service
              </Label>
              <p className="text-xs text-muted-foreground">
                Configure tax behavior and tax codes for this service
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Switch disabled checked={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Assignment Section */}
      {calendarId && onTeamMembersChange && (
        <div className="space-y-4">
          <TeamMemberSelector
            calendarId={calendarId}
            selectedMemberIds={selectedTeamMembers}
            onSelectionChange={onTeamMembersChange}
            disabled={saving}
          />
        </div>
      )}
      
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !isValidForm()}>
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}
