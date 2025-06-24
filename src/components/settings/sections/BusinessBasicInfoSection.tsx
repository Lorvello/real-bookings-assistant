
import React from 'react';
import Select from 'react-select';
import { businessTypes } from '@/constants/settingsOptions';

interface BusinessBasicInfoSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
}

export const BusinessBasicInfoSection: React.FC<BusinessBasicInfoSectionProps> = ({
  businessData,
  setBusinessData
}) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Business Information</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Name *
          </label>
          <input 
            type="text" 
            value={businessData.business_name} 
            onChange={e => setBusinessData({
              ...businessData,
              business_name: e.target.value
            })} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Type *
          </label>
          <Select 
            value={businessTypes.find(type => type.value === businessData.business_type)} 
            onChange={option => setBusinessData({
              ...businessData,
              business_type: option?.value || ''
            })} 
            options={businessTypes} 
            className="react-select-container" 
            classNamePrefix="react-select" 
            placeholder="Search and select business type..." 
            isSearchable 
            styles={{
              control: base => ({
                ...base,
                backgroundColor: '#111827',
                borderColor: '#374151',
                '&:hover': {
                  borderColor: '#10B981'
                }
              }),
              menu: base => ({
                ...base,
                backgroundColor: '#111827'
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isSelected ? '#10B981' : state.isFocused ? '#1F2937' : '#111827',
                color: 'white'
              }),
              singleValue: base => ({
                ...base,
                color: 'white'
              }),
              input: base => ({
                ...base,
                color: 'white'
              })
            }} 
          />
          
          {businessData.business_type === 'other' && (
            <input 
              type="text" 
              value={businessData.business_type_other} 
              onChange={e => setBusinessData({
                ...businessData,
                business_type_other: e.target.value
              })} 
              placeholder="Specify business type..." 
              className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Business Description
          </label>
          <textarea 
            value={businessData.business_description} 
            onChange={e => setBusinessData({
              ...businessData,
              business_description: e.target.value
            })} 
            rows={4} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="Tell customers about your business..." 
          />
        </div>
      </div>
    </div>
  );
};
