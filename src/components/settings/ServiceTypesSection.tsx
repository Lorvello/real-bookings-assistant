
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceType } from '@/types/database';

interface ServiceTypeForm {
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  max_attendees: number;
  preparation_time: number;
  cleanup_time: number;
}

const defaultServiceType: ServiceTypeForm = {
  name: '',
  description: '',
  duration: 60,
  price: 0,
  color: '#3B82F6',
  max_attendees: 1,
  preparation_time: 0,
  cleanup_time: 0,
};

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

export const ServiceTypesSection: React.FC = () => {
  const { selectedCalendar } = useCalendarContext();
  const { serviceTypes, loading, createServiceType, updateServiceType, deleteServiceType } = useServiceTypes(selectedCalendar?.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceTypeForm>(defaultServiceType);

  const handleInputChange = (field: keyof ServiceTypeForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedCalendar) return;

    const serviceTypeData = {
      ...formData,
      calendar_id: selectedCalendar.id,
      is_active: true,
    };

    if (editingId) {
      await updateServiceType(editingId, serviceTypeData);
      setEditingId(null);
    } else {
      await createServiceType(serviceTypeData);
      setShowAddForm(false);
    }
    
    setFormData(defaultServiceType);
  };

  const handleEdit = (serviceType: ServiceType) => {
    setFormData({
      name: serviceType.name,
      description: serviceType.description || '',
      duration: serviceType.duration,
      price: serviceType.price || 0,
      color: serviceType.color,
      max_attendees: serviceType.max_attendees,
      preparation_time: serviceType.preparation_time,
      cleanup_time: serviceType.cleanup_time,
    });
    setEditingId(serviceType.id);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData(defaultServiceType);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Weet je zeker dat je dit service type wilt verwijderen?')) {
      await deleteServiceType(id);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Service Types</h2>
        {!showAddForm && !editingId && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Service Toevoegen
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-600">
          <h3 className="text-lg font-medium text-white mb-4">
            {editingId ? 'Service Bewerken' : 'Nieuwe Service'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service Naam *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
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
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
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
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
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
                onChange={(e) => handleInputChange('max_attendees', parseInt(e.target.value) || 1)}
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
                onChange={(e) => handleInputChange('preparation_time', parseInt(e.target.value) || 0)}
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
                onChange={(e) => handleInputChange('cleanup_time', parseInt(e.target.value) || 0)}
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
              onChange={(e) => handleInputChange('description', e.target.value)}
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
                  onClick={() => handleInputChange('color', color)}
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
              onClick={handleCancel}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Annuleren
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || formData.duration <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingId ? 'Bijwerken' : 'Opslaan'}
            </Button>
          </div>
        </div>
      )}

      {/* Service Types List */}
      <div className="space-y-4">
        {serviceTypes.length > 0 ? (
          serviceTypes.map((serviceType) => (
            <div
              key={serviceType.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: serviceType.color }}
                  />
                  <div>
                    <h3 className="text-white font-medium">{serviceType.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                      <span>{formatDuration(serviceType.duration)}</span>
                      {serviceType.price && <span>€{serviceType.price.toFixed(2)}</span>}
                      <span>{serviceType.max_attendees} persoon(en)</span>
                      <Badge variant={serviceType.is_active ? "default" : "secondary"}>
                        {serviceType.is_active ? "Actief" : "Inactief"}
                      </Badge>
                    </div>
                    {serviceType.description && (
                      <p className="text-gray-400 text-sm mt-1">{serviceType.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(serviceType)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(serviceType.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nog geen service types toegevoegd</p>
              <p className="text-sm">Voeg je eerste service toe om te beginnen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
