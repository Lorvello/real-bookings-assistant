
import React from 'react';
import Select from 'react-select';
import { businessTypes } from '@/constants/settingsOptions';

interface BusinessTabProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
}

export const BusinessTab: React.FC<BusinessTabProps> = ({
  businessData,
  setBusinessData,
  loading,
  handleUpdateProfile
}) => {
  return (
    <div className="space-y-8">
      {/* Bedrijfs Basis Info */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Bedrijfsinformatie</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsnaam *
            </label>
            <input
              type="text"
              value={businessData.business_name}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_name: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type Bedrijf *
            </label>
            <Select
              value={businessTypes.find(type => type.value === businessData.business_type)}
              onChange={(option) => setBusinessData({
                ...businessData,
                business_type: option?.value || ''
              })}
              options={businessTypes}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Zoek en selecteer type bedrijf..."
              isSearchable
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  '&:hover': {
                    borderColor: '#10B981'
                  }
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#111827'
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? '#10B981'
                    : state.isFocused
                    ? '#1F2937'
                    : '#111827',
                  color: 'white'
                }),
                singleValue: (base) => ({
                  ...base,
                  color: 'white'
                }),
                input: (base) => ({
                  ...base,
                  color: 'white'
                })
              }}
            />
            
            {businessData.business_type === 'other' && (
              <input
                type="text"
                value={businessData.business_type_other}
                onChange={(e) => setBusinessData({
                  ...businessData,
                  business_type_other: e.target.value
                })}
                placeholder="Specificeer type bedrijf..."
                className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsomschrijving
            </label>
            <textarea
              value={businessData.business_description}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_description: e.target.value
              })}
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Vertel klanten over uw bedrijf..."
            />
          </div>
        </div>
      </div>

      {/* Knowledge Base van de Booking Agent */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Knowledge Base van de Booking Agent</h2>
        <p className="text-sm text-gray-400 mb-6">Deze informatie wordt gebruikt door de AI booking agent om klanten te helpen</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Parkeerinformatie
            </label>
            <textarea
              value={businessData.parking_info}
              onChange={(e) => setBusinessData({
                ...businessData,
                parking_info: e.target.value
              })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: Gratis parkeren voor de deur, Betaald parkeren in garage om de hoek..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Openbaar Vervoer
            </label>
            <textarea
              value={businessData.public_transport_info}
              onChange={(e) => setBusinessData({
                ...businessData,
                public_transport_info: e.target.value
              })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: 5 minuten lopen vanaf station, Bus 12 stopt voor de deur..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Toegankelijkheid
            </label>
            <textarea
              value={businessData.accessibility_info}
              onChange={(e) => setBusinessData({
                ...businessData,
                accessibility_info: e.target.value
              })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: Rolstoeltoegankelijk, Lift aanwezig, Drempelloos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Anders
            </label>
            <textarea
              value={businessData.other_info}
              onChange={(e) => setBusinessData({
                ...businessData,
                other_info: e.target.value
              })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Overige informatie die nuttig kan zijn voor klanten..."
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdateProfile}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : 'Bedrijfsinformatie Opslaan'}
      </button>
    </div>
  );
};
