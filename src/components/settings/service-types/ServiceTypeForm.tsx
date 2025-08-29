
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceTypeStripeConfig } from './ServiceTypeStripeConfig';
import { ServiceType } from '@/types/calendar';
import { Lock, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  userTaxBehavior
}: ServiceTypeFormProps) {
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

      {/* Tax Configuration Section */}
      <div className="space-y-4 border-t border-border pt-6">
        <h3 className="text-lg font-medium text-foreground">Tax Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tax-enabled" className="text-sm font-medium">
                Enable Tax for this service
              </Label>
              <p className="text-xs text-muted-foreground">
                Configure tax behavior and tax codes for this service
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!taxConfigured && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Configure tax settings first in Tax page</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Switch
                id="tax-enabled"
                checked={formData.tax_enabled}
                onCheckedChange={(checked) => {
                  // If enabling tax, apply fallback tax behavior if not set
                  if (checked && !formData.tax_behavior) {
                    setFormData(prev => ({ 
                      ...prev, 
                      tax_enabled: checked,
                      tax_behavior: (userTaxBehavior as 'inclusive' | 'exclusive') || 'exclusive'
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, tax_enabled: checked }));
                  }
                }}
                disabled={!taxConfigured}
              />
            </div>
          </div>

          {!taxConfigured && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Configure tax first. Please complete your tax settings before enabling tax on services.
              </p>
            </div>
          )}

          {/* Show validation error if tax enabled but missing required fields */}
          {formData.tax_enabled && (!formData.tax_code || !formData.tax_behavior) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Tax code and tax behavior are required when tax is enabled.
              </p>
            </div>
          )}

          {formData.tax_enabled && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tax Behavior</Label>
                <RadioGroup
                  value={formData.tax_behavior}
                  onValueChange={handleTaxBehaviorChange}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inclusive" id="inclusive" />
                    <Label htmlFor="inclusive" className="text-sm">
                      Inclusive
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exclusive" id="exclusive" />
                    <Label htmlFor="exclusive" className="text-sm">
                      Exclusive
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  <strong>Inclusive:</strong> Price includes tax • <strong>Exclusive:</strong> Tax added on top
                </p>
                
                {/* Tax behavior warning */}
                {showTaxBehaviorWarning && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm text-warning-foreground">
                        <strong>Warning:</strong> This changes what your customer pays at checkout. 
                        Switching from inclusive to exclusive tax will increase the final amount customers pay.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTaxBehaviorWarning(false)}
                        className="text-xs underline text-warning-foreground"
                      >
                        I understand
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tax Code</Label>
                <Select
                  value={formData.tax_code}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tax_code: value }))}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select a tax code" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {TAX_CODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the appropriate tax category for this service
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
