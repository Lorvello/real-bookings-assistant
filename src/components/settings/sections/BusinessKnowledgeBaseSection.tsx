
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
      <h2 className="text-xl font-semibold text-white mb-6">Knowledge Base van de Booking Agent</h2>
      <p className="text-sm text-gray-400 mb-6">Deze informatie wordt gebruikt door de AI booking agent om klanten te helpen als ze vragen hebben</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Parkeerinformatie
          </label>
          <textarea 
            value={businessData.parking_info} 
            onChange={e => setBusinessData({
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
            onChange={e => setBusinessData({
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
            onChange={e => setBusinessData({
              ...businessData,
              accessibility_info: e.target.value
            })} 
            rows={3} 
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
            placeholder="Bijv. Rolstoeltoegankelijk, Lift aanwezig, Drempelloos..." 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Anders
          </label>
          <textarea 
            value={businessData.other_info} 
            onChange={e => setBusinessData({
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
  );
};
