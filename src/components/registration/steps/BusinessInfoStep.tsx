
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
          Business Information
        </h3>
        <p className="text-gray-600">
          Tell us about your business so customers can find you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            type="text"
            value={data.businessName}
            onChange={(e) => updateData({ businessName: e.target.value })}
            placeholder="Your business name"
            className="h-12"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Select
            value={businessTypes.find(type => type.value === data.businessType)}
            onChange={(option) => updateData({ businessType: option?.value || '' })}
            options={businessTypes}
            placeholder="Select your business type..."
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
          <Label htmlFor="businessEmail">Business Email Address *</Label>
          <Input
            id="businessEmail"
            type="email"
            value={data.businessEmail}
            onChange={(e) => updateData({ businessEmail: e.target.value })}
            placeholder="contact@yourbusiness.com"
            className="h-12"
          />
        </div>

        <div className="md:col-span-2 mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Business Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="street">Street Name</Label>
              <Input
                id="street"
                type="text"
                value={data.businessAddress.street}
                onChange={(e) => updateAddress('street', e.target.value)}
                placeholder="Main Street"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Number</Label>
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
              <Label htmlFor="postal">Postal Code</Label>
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
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                value={data.businessAddress.city}
                onChange={(e) => updateAddress('city', e.target.value)}
                placeholder="City name"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
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
