
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Select from 'react-select';
import { businessTypes } from '@/constants/settingsOptions';

interface BusinessInfoStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export const BusinessInfoStep: React.FC<BusinessInfoStepProps> = ({ data, updateData }) => {
  const updateAddress = (field: string, value: string) => {
    updateData({
      businessAddress: {
        ...data.businessAddress,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Bedrijfsinformatie
        </h3>
        <p className="text-gray-600">
          Vertel ons over je bedrijf zodat klanten je kunnen vinden
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="businessName">Bedrijfsnaam *</Label>
          <Input
            id="businessName"
            type="text"
            value={data.businessName}
            onChange={(e) => updateData({ businessName: e.target.value })}
            placeholder="Naam van je bedrijf"
            className="h-12"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="businessType">Type Bedrijf *</Label>
          <Select
            value={businessTypes.find(type => type.value === data.businessType)}
            onChange={(option) => updateData({ businessType: option?.value || '' })}
            options={businessTypes}
            placeholder="Selecteer je bedrijfstype..."
            isSearchable
            className="react-select-container"
            classNamePrefix="react-select"
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '48px',
                backgroundColor: 'white',
                borderColor: '#d1d5db',
                '&:hover': { borderColor: '#16a34a' }
              }),
              menu: (base) => ({ ...base, backgroundColor: 'white' }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? '#16a34a' : state.isFocused ? '#f3f4f6' : 'white',
                color: state.isSelected ? 'white' : 'black'
              })
            }}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="businessEmail">Bedrijfs E-mailadres *</Label>
          <Input
            id="businessEmail"
            type="email"
            value={data.businessEmail}
            onChange={(e) => updateData({ businessEmail: e.target.value })}
            placeholder="contact@jebedrijf.nl"
            className="h-12"
          />
        </div>

        <div className="md:col-span-2 mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Bedrijfsadres</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="street">Straatnaam</Label>
              <Input
                id="street"
                type="text"
                value={data.businessAddress.street}
                onChange={(e) => updateAddress('street', e.target.value)}
                placeholder="Hoofdstraat"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Nummer</Label>
              <Input
                id="number"
                type="text"
                value={data.businessAddress.number}
                onChange={(e) => updateAddress('number', e.target.value)}
                placeholder="123"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal">Postcode</Label>
              <Input
                id="postal"
                type="text"
                value={data.businessAddress.postal}
                onChange={(e) => updateAddress('postal', e.target.value)}
                placeholder="1234 AB"
                className="h-12"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="city">Plaats</Label>
              <Input
                id="city"
                type="text"
                value={data.businessAddress.city}
                onChange={(e) => updateAddress('city', e.target.value)}
                placeholder="Amsterdam"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                type="text"
                value={data.businessAddress.country}
                onChange={(e) => updateAddress('country', e.target.value)}
                className="h-12"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
