
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface ServiceTypeFormData {
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  max_attendees: number;
  preparation_time: number;
  cleanup_time: number;
}

interface ServiceTypeFormProps {
  formData: ServiceTypeFormData;
  onInputChange: (field: keyof ServiceTypeFormData, value: string | number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitDisabled: boolean;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export const ServiceTypeForm: React.FC<ServiceTypeFormProps> = ({
  formData,
  onInputChange,
  onSubmit,
  onCancel,
  isEditing,
  isSubmitDisabled
}) => {
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-600">
      <h3 className="text-lg font-medium text-white mb-4">
        {isEditing ? 'Service Bewerken' : 'Nieuwe Service'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Service Naam *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
            placeholder="Bijv. Kapsel & Kleuren"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duur (minuten) *
          </label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => onInputChange('duration', parseInt(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
            min="5"
            max="480"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Prijs (€)
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => onInputChange('price', parseFloat(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max. Personen
          </label>
          <Input
            type="number"
            value={formData.max_attendees}
            onChange={(e) => onInputChange('max_attendees', parseInt(e.target.value) || 1)}
            className="bg-gray-800 border-gray-600 text-white"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Voorbereiding (min)
          </label>
          <Input
            type="number"
            value={formData.preparation_time}
            onChange={(e) => onInputChange('preparation_time', parseInt(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Opruimen (min)
          </label>
          <Input
            type="number"
            value={formData.cleanup_time}
            onChange={(e) => onInputChange('cleanup_time', parseInt(e.target.value) || 0)}
            className="bg-gray-800 border-gray-600 text-white"
            min="0"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Beschrijving
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          className="bg-gray-800 border-gray-600 text-white"
          rows={3}
          placeholder="Optionele beschrijving van de service..."
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Kleur
        </label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <button
              key={color}
              onClick={() => onInputChange('color', color)}
              className={`w-8 h-8 rounded-full border-2 ${
                formData.color === color ? 'border-white' : 'border-gray-600'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-6">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <X className="h-4 w-4 mr-2" />
          Annuleren
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Bijwerken' : 'Opslaan'}
        </Button>
      </div>
    </div>
  );
};
