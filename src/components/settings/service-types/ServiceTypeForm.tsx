
import React from 'react';
import { Button } from '@/components/ui/button';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: string;
  price: string;
  color: string;
}

interface ServiceTypeFormProps {
  formData: ServiceTypeFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServiceTypeFormData>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export function ServiceTypeForm({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  saving, 
  isEditing 
}: ServiceTypeFormProps) {
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
      
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !formData.name.trim()}>
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </div>
  );
}
