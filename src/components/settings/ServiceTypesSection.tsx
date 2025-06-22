
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { ServiceType } from '@/types/database';
import { ServiceTypeForm } from './service-types/ServiceTypeForm';
import { ServiceTypeItem } from './service-types/ServiceTypeItem';
import { ServiceTypesEmptyState } from './service-types/ServiceTypesEmptyState';

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
        <ServiceTypeForm
          formData={formData}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
          isSubmitDisabled={!formData.name || formData.duration <= 0}
        />
      )}

      {/* Service Types List */}
      <div className="space-y-4">
        {serviceTypes.length > 0 ? (
          serviceTypes.map((serviceType) => (
            <ServiceTypeItem
              key={serviceType.id}
              serviceType={serviceType}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <ServiceTypesEmptyState onAddService={() => setShowAddForm(true)} />
        )}
      </div>
    </div>
  );
};
