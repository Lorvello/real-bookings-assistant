
import React, { useState } from 'react';
import { Plus, MoreVertical, MessageCircle, Clock, Euro, Users, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useToast } from '@/hooks/use-toast';
import { ServiceType } from '@/types/database';

interface ServiceTypesManagerProps {
  calendarId: string;
}

export function ServiceTypesManager({ calendarId }: ServiceTypesManagerProps) {
  const { toast } = useToast();
  const { serviceTypes, loading, createServiceType, updateServiceType, deleteServiceType } = useServiceTypes(calendarId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    color: '#3B82F6',
    max_attendees: 1,
    preparation_time: 0,
    cleanup_time: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration: 30,
      price: 0,
      color: '#3B82F6',
      max_attendees: 1,
      preparation_time: 0,
      cleanup_time: 0,
    });
    setEditingService(null);
    setShowAddModal(false);
  };

  const handleEdit = (service: ServiceType) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price || 0,
      color: service.color,
      max_attendees: service.max_attendees,
      preparation_time: service.preparation_time,
      cleanup_time: service.cleanup_time,
    });
    setEditingService(service);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Service naam is verplicht",
        variant: "destructive",
      });
      return;
    }

    if (formData.duration <= 0) {
      toast({
        title: "Error", 
        description: "Duur moet groter zijn dan 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const serviceData = {
        ...formData,
        calendar_id: calendarId,
        is_active: true,
      };

      if (editingService) {
        await updateServiceType(editingService.id, serviceData);
        toast({
          title: "Success",
          description: "Service type succesvol bijgewerkt",
        });
      } else {
        await createServiceType(serviceData);
        toast({
          title: "Success", 
          description: "Service type succesvol aangemaakt",
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving service type:', error);
      toast({
        title: "Error",
        description: "Kon service type niet opslaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je dit service type wilt verwijderen?')) {
      return;
    }

    try {
      await deleteServiceType(id);
      toast({
        title: "Success",
        description: "Service type succesvol verwijderd",
      });
    } catch (error) {
      console.error('Error deleting service type:', error);
      toast({
        title: "Error",
        description: "Kon service type niet verwijderen. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'Gratis';
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Services</CardTitle>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add/Edit Form */}
        {showAddModal && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-background-secondary">
            <h3 className="text-lg font-medium text-foreground mb-4">
              {editingService ? 'Service Bewerken' : 'Nieuwe Service'}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                  min="0"
                  step="0.01"
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
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
                {saving ? 'Opslaan...' : editingService ? 'Bijwerken' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        )}

        {/* Services List */}
        {serviceTypes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceTypes.map((service) => (
              <div
                key={service.id}
                className="bg-background-secondary rounded-lg p-4 border border-border hover:border-primary/50 transition-colors group"
              >
                {/* Service Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: service.color }}
                    />
                    <h3 className="text-foreground font-medium truncate">{service.name}</h3>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Service Description */}
                {service.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {service.description}
                  </p>
                )}

                {/* Service Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Duur:</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Euro className="h-4 w-4 mr-1" />
                      <span>Prijs:</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {formatPrice(service.price)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Max personen:</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {service.max_attendees}
                    </span>
                  </div>
                </div>

                {/* Service Status & WhatsApp */}
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Actief" : "Inactief"}
                    </Badge>
                    
                    {(service.preparation_time > 0 || service.cleanup_time > 0) && (
                      <div className="text-xs text-muted-foreground">
                        {service.preparation_time > 0 && `${service.preparation_time}min voorbereiding`}
                        {service.preparation_time > 0 && service.cleanup_time > 0 && " • "}
                        {service.cleanup_time > 0 && `${service.cleanup_time}min opruimen`}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Availability Indicator */}
                  <div className="flex items-center text-xs text-whatsapp">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span>Beschikbaar via WhatsApp</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Geen services gevonden</h3>
            <p className="text-muted-foreground mb-4">
              Voeg je eerste service toe om boekingen te kunnen ontvangen
            </p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Eerste Service Toevoegen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
