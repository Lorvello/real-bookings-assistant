
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface ServiceTypesStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export const ServiceTypesStep: React.FC<ServiceTypesStepProps> = ({ data, updateData }) => {
  const [newService, setNewService] = useState({
    name: '',
    duration: 60,
    price: '',
    description: ''
  });

  const addService = () => {
    if (!newService.name || !newService.duration) return;
    
    const service = {
      name: newService.name,
      duration: newService.duration,
      price: newService.price ? parseFloat(newService.price) : undefined,
      description: newService.description || undefined
    };

    updateData({
      serviceTypes: [...data.serviceTypes, service]
    });

    setNewService({ name: '', duration: 60, price: '', description: '' });
  };

  const removeService = (index: number) => {
    const newServices = data.serviceTypes.filter((_: any, i: number) => i !== index);
    updateData({ serviceTypes: newServices });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Service Types
        </h3>
        <p className="text-gray-600">
          Voeg de diensten toe die je aanbiedt. Je kunt later meer toevoegen of wijzigen.
        </p>
      </div>

      {/* Add New Service Form */}
      <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Nieuwe Service Toevoegen</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Naam *</Label>
            <Input
              id="serviceName"
              type="text"
              value={newService.name}
              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              placeholder="Bijv. Kapsel & Kleuren"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDuration">Duur (minuten) *</Label>
            <Input
              id="serviceDuration"
              type="number"
              value={newService.duration}
              onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) || 60 })}
              min="15"
              max="480"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servicePrice">Prijs (€) - optioneel</Label>
            <Input
              id="servicePrice"
              type="number"
              step="0.01"
              value={newService.price}
              onChange={(e) => setNewService({ ...newService, price: e.target.value })}
              placeholder="0.00"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Beschrijving - optioneel</Label>
            <Textarea
              id="serviceDescription"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Korte beschrijving van de service..."
              rows={3}
            />
          </div>
        </div>

        <Button
          onClick={addService}
          disabled={!newService.name || !newService.duration}
          className="mt-4 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Service Toevoegen
        </Button>
      </div>

      {/* Service Types List */}
      {data.serviceTypes.length > 0 &&(
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Toegevoegde Services</h4>
          {data.serviceTypes.map((service: any, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">{service.name}</h5>
                <div className="text-sm text-gray-600 space-x-4">
                  <span>{formatDuration(service.duration)}</span>
                  {service.price && <span>€{service.price.toFixed(2)}</span>}
                </div>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeService(index)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.serviceTypes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Nog geen services toegevoegd. Voeg je eerste service toe om verder te gaan.</p>
        </div>
      )}
    </div>
  );
};
