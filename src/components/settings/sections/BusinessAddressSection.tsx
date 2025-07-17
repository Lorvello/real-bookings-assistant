import React from 'react';

interface BusinessAddressSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
}

export const BusinessAddressSection: React.FC<BusinessAddressSectionProps> = ({
  businessData,
  setBusinessData
}) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Bedrijfs Adresgegevens</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Straatnaam
          </label>
          <input
            type="text"
            value={businessData.business_street}
            onChange={(e) => setBusinessData({
              ...businessData,
              business_street: e.target.value
            })}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Huisnummer
          </label>
          <input
            type="text"
            value={businessData.business_number}
            onChange={(e) => setBusinessData({
              ...businessData,
              business_number: e.target.value
            })}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Postcode
          </label>
          <input
            type="text"
            value={businessData.business_postal}
            onChange={(e) => setBusinessData({
              ...businessData,
              business_postal: e.target.value
            })}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Plaats
          </label>
          <input
            type="text"
            value={businessData.business_city}
            onChange={(e) => setBusinessData({
              ...businessData,
              business_city: e.target.value
            })}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Land
          </label>
          <input
            type="text"
            value={businessData.business_country}
            onChange={(e) => setBusinessData({
              ...businessData,
              business_country: e.target.value
            })}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};