
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { CalendarSettings } from '@/types/database';

interface CalendarRequiredFieldsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

export function CalendarRequiredFields({ settings, onUpdate }: CalendarRequiredFieldsProps) {
  const [requiredFields, setRequiredFields] = useState({
    // Default fields - always required
    name: true,
    email: true,
    service: true,
    // Optional fields - can be toggled
    phone: false,
    address: false,
    company: false,
    dateOfBirth: false,
    emergencyContact: false,
    medicalInfo: false,
    specialRequests: false,
    howDidYouHear: false,
    previousExperience: false,
    budget: false,
    preferredCommunication: false
  });

  const updateField = (field: string, value: boolean) => {
    setRequiredFields(prev => ({ ...prev, [field]: value }));
    // Here you could save to settings if needed
    // onUpdate({ required_fields: { ...requiredFields, [field]: value } });
  };

  const defaultFields = [
    { key: 'name', label: 'Name', description: 'Full name of the customer' },
    { key: 'email', label: 'Email address', description: 'For confirmations and communication' },
    { key: 'service', label: 'Service type', description: 'Which service the customer wants to book' }
  ];

  const optionalFields = [
    { key: 'phone', label: 'Phone number', description: 'For direct communication and WhatsApp' },
    { key: 'address', label: 'Address', description: 'Customer\'s home address' },
    { key: 'company', label: 'Company name', description: 'For business customers' },
    { key: 'dateOfBirth', label: 'Date of birth', description: 'For age-related services' },
    { key: 'emergencyContact', label: 'Emergency contact', description: 'For medical or risky treatments' },
    { key: 'medicalInfo', label: 'Medical information', description: 'Allergies, medication, conditions' },
    { key: 'specialRequests', label: 'Special requests', description: 'Extra requests or comments' },
    { key: 'howDidYouHear', label: 'How did you hear about us', description: 'Marketing tracking' },
    { key: 'previousExperience', label: 'Previous experience', description: 'With similar services' },
    { key: 'budget', label: 'Budget indication', description: 'For personalized recommendations' },
    { key: 'preferredCommunication', label: 'Communication preference', description: 'Email, phone, WhatsApp, etc.' }
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure which information the AI agent should collect before an appointment can be scheduled.
      </p>

      {/* Default Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-foreground">Default fields</h3>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          These fields are always required and cannot be disabled.
        </p>
        
        <div className="space-y-3">
          {defaultFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-foreground">{field.label}</div>
                <div className="text-xs text-muted-foreground">{field.description}</div>
              </div>
              <Switch
                checked={true}
                disabled={true}
                className="ml-4 opacity-50"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Optional Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-foreground">Optional fields</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable additional information fields that are relevant for your business.
        </p>
        
        <div className="space-y-3">
          {optionalFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors">
              <div className="space-y-1 flex-1">
                <div className="text-sm font-medium text-foreground">{field.label}</div>
                <div className="text-xs text-muted-foreground">{field.description}</div>
              </div>
              <Switch
                checked={requiredFields[field.key as keyof typeof requiredFields]}
                onCheckedChange={(checked) => updateField(field.key, checked)}
                className="ml-4"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
        <p className="text-xs text-muted-foreground">
          The agent will collect {3 + Object.values(requiredFields).filter(Boolean).length - 3} information fields 
          before an appointment is scheduled.
        </p>
      </div>
    </div>
  );
}
