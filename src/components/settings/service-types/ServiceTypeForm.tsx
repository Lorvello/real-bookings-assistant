
import React from 'react';
import { Button } from '@/components/ui/button';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: number;
  price: string;
  color: string;
  max_attendees: number;
  preparation_time: number;
  cleanup_time: number;
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
    <div className="mb-6 p-4 border border-border rounded-lg bg-background-secondary">
      <h3 className="text-lg font-medium text-foreground mb-4">
        {isEditing ? 'Service Bewerken' : 'Nieuwe Service'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Service Naam *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            placeholder="Bijv. Knipbeurt"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Duur (minuten) *
          </label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            min="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Prijs (€)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Max Personen
          </label>
          <input
            type="number"
            value={formData.max_attendees}
            onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: parseInt(e.target.value) || 1 }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            min="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Voorbereiding (min)
          </label>
          <input
            type="number"
            value={formData.preparation_time}
            onChange={(e) => setFormData(prev => ({ ...prev, preparation_time: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Opruimen (min)
          </label>
          <input
            type="number"
            value={formData.cleanup_time}
            onChange={(e) => setFormData(prev => ({ ...prev, cleanup_time: parseInt(e.target.value) || 0 }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            min="0"
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Beschrijving
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-2 border border-border rounded-md bg-background text-foreground"
            rows={3}
            placeholder="Optionele beschrijving van de service"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Kleur
          </label>
          <div className="flex flex-wrap gap-2">
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
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Annuleren
        </Button>
        <Button onClick={onSave} disabled={saving || !formData.name.trim()}>
          {saving ? 'Opslaan...' : isEditing ? 'Bijwerken' : 'Aanmaken'}
        </Button>
      </div>
    </div>
  );
}
