import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamMemberSelector } from "@/components/service-types/TeamMemberSelector";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  tax_enabled: boolean;
  tax_behavior: 'inclusive' | 'exclusive';
  applicable_tax_rate: number;
  tax_rate_type: string;
  service_category: string;
}

export interface ServiceTypeFormProps {
  formData: ServiceTypeFormData;
  setFormData: (data: ServiceTypeFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  userTaxBehavior: 'inclusive' | 'exclusive' | null;
  onTaxBehaviorChange?: (behavior: 'inclusive' | 'exclusive') => void;
  hasCompleteTaxConfig: boolean;
  calendarId?: string;
  selectedTeamMembers?: string[];
  onTeamMembersChange?: (memberIds: string[]) => void;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

const TAX_CODE_OPTIONS = [
  { value: 'standard', label: 'Standard Rate (21%)' },
  { value: 'reduced', label: 'Reduced Rate (9%)' },
  { value: 'zero', label: 'Zero Rate (0%)' }
];

export const ServiceTypeForm: React.FC<ServiceTypeFormProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
  isEditing,
  userTaxBehavior,
  onTaxBehaviorChange,
  hasCompleteTaxConfig,
  calendarId,
  selectedTeamMembers = [],
  onTeamMembersChange
}) => {
  const [showTaxWarning, setShowTaxWarning] = useState(false);

  const isValidForm = () => {
    return formData.name.trim().length > 0 && formData.duration > 0;
  };

  const handleTaxBehaviorChange = (behavior: 'inclusive' | 'exclusive') => {
    if (isEditing && formData.tax_behavior === 'inclusive' && behavior === 'exclusive') {
      setShowTaxWarning(true);
    }
    setFormData({ ...formData, tax_behavior: behavior });
    onTaxBehaviorChange?.(behavior);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Service Name *
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Haircut"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="duration" className="text-sm font-medium">
            Duration (minutes) *
          </Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
            placeholder="30"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="price" className="text-sm font-medium">
            Price (€)
          </Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Color</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => setFormData({ ...formData, color })}
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
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of the service"
            rows={3}
            className="mt-1"
          />
        </div>
      </div>

      {/* Team Member Assignment Section */}
      {calendarId && onTeamMembersChange && (
        <>
          <Separator className="my-6" />
          <TeamMemberSelector
            calendarId={calendarId}
            selectedMemberIds={selectedTeamMembers}
            onSelectionChange={onTeamMembersChange}
            disabled={saving}
          />
        </>
      )}

      {/* Tax Configuration Section */}
      <Separator className="my-6" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="tax_enabled" className="text-sm font-medium">
              Enable Tax
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Add tax to this service
            </p>
          </div>
          <Switch
            id="tax_enabled"
            checked={formData.tax_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, tax_enabled: checked })}
            disabled={!hasCompleteTaxConfig}
          />
        </div>

        {!hasCompleteTaxConfig && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Complete your tax configuration in Settings to enable tax on services.
            </AlertDescription>
          </Alert>
        )}

        {formData.tax_enabled && hasCompleteTaxConfig && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <div>
              <Label className="text-sm font-medium">Tax Behavior</Label>
              <RadioGroup
                value={formData.tax_behavior}
                onValueChange={handleTaxBehaviorChange}
                className="mt-2 space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inclusive" id="inclusive" />
                  <Label htmlFor="inclusive" className="text-sm cursor-pointer">
                    Inclusive - Price includes tax
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="exclusive" id="exclusive" />
                  <Label htmlFor="exclusive" className="text-sm cursor-pointer">
                    Exclusive - Tax added on top
                  </Label>
                </div>
              </RadioGroup>
              
              {showTaxWarning && (
                <Alert className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Changing from inclusive to exclusive will increase the final price customers pay.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div>
              <Label htmlFor="tax_rate_type" className="text-sm font-medium">
                Tax Rate
              </Label>
              <Select
                value={formData.tax_rate_type}
                onValueChange={(value) => setFormData({ ...formData, tax_rate_type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  {TAX_CODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !isValidForm()}>
          {saving ? 'Saving...' : isEditing ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </div>
  );
};
