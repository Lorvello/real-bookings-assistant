
import React from 'react';

interface BusinessKnowledgeBaseSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
}

export const BusinessKnowledgeBaseSection: React.FC<BusinessKnowledgeBaseSectionProps> = ({
  businessData,
  setBusinessData
}) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-6">Booking Agent Knowledge Base</h2>
      <p className="text-sm text-gray-400 mb-6">This information is used by the AI booking agent to help customers when they have questions</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Parking Information
          </label>
          <textarea 
            value={businessData.parking_info} 
            onChange={e => setBusinessData({
              ...businessData,
              parking_info: e.target.value
            })} 
            rows={3} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="e.g. Free parking in front of the door, Paid parking in garage around the corner..." 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Public Transport
          </label>
          <textarea 
            value={businessData.public_transport_info} 
            onChange={e => setBusinessData({
              ...businessData,
              public_transport_info: e.target.value
            })} 
            rows={3} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="e.g. 5 minutes walk from station, Bus 12 stops in front of the door..." 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Accessibility
          </label>
          <textarea 
            value={businessData.accessibility_info} 
            onChange={e => setBusinessData({
              ...businessData,
              accessibility_info: e.target.value
            })} 
            rows={3} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="e.g. Wheelchair accessible, Elevator available, No barriers..." 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Other Information
          </label>
          <textarea 
            value={businessData.other_info} 
            onChange={e => setBusinessData({
              ...businessData,
              other_info: e.target.value
            })} 
            rows={3} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="Other information that might be useful for customers..." 
          />
        </div>
      </div>
    </div>
  );
};
