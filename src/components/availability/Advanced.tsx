
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';

interface AdvancedProps {
  onChange: () => void;
}

export const Advanced: React.FC<AdvancedProps> = ({ onChange }) => {
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
    onChange();
  };

  const defaultFields = [
    { key: 'name', label: 'Naam', description: 'Volledige naam van de klant' },
    { key: 'email', label: 'E-mailadres', description: 'Voor bevestigingen en communicatie' },
    { key: 'service', label: 'Service type', description: 'Welke service de klant wil boeken' }
  ];

  const optionalFields = [
    { key: 'phone', label: 'Telefoonnummer', description: 'Voor directe communicatie en WhatsApp' },
    { key: 'address', label: 'Adres', description: 'Woonadres van de klant' },
    { key: 'company', label: 'Bedrijfsnaam', description: 'Voor zakelijke klanten' },
    { key: 'dateOfBirth', label: 'Geboortedatum', description: 'Voor leeftijdsgerelateerde services' },
    { key: 'emergencyContact', label: 'Noodcontact', description: 'Voor medische of risicovolle treatments' },
    { key: 'medicalInfo', label: 'Medische informatie', description: 'Allergieën, medicatie, aandoeningen' },
    { key: 'specialRequests', label: 'Speciale wensen', description: 'Extra verzoeken of opmerkingen' },
    { key: 'howDidYouHear', label: 'Hoe van ons gehoord', description: 'Marketing tracking' },
    { key: 'previousExperience', label: 'Eerdere ervaring', description: 'Met vergelijkbare services' },
    { key: 'budget', label: 'Budget indicatie', description: 'Voor gepersonaliseerde aanbevelingen' },
    { key: 'preferredCommunication', label: 'Communicatie voorkeur', description: 'E-mail, telefoon, WhatsApp, etc.' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Vereiste informatie</h2>
        <p className="text-sm text-muted-foreground">
          Configureer welke informatie de AI-agent moet verzamelen voordat een afspraak kan worden ingepland.
        </p>
      </div>

      {/* Default Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium text-foreground">Standaard velden</h3>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Deze velden zijn altijd vereist en kunnen niet worden uitgeschakeld.
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
          <h3 className="text-lg font-medium text-foreground">Optionele velden</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Schakel extra informatievelden in die relevant zijn voor jouw business.
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
        <h4 className="text-sm font-medium text-foreground mb-2">Samenvatting</h4>
        <p className="text-xs text-muted-foreground">
          De agent zal {3 + Object.values(requiredFields).filter(Boolean).length - 3} informatievelden verzamelen 
          voordat een afspraak wordt ingepland.
        </p>
      </div>
    </div>
  );
};
