
import React from 'react';
import { ServiceTypesSection } from './ServiceTypesSection';
import { BusinessBasicInfoSection } from './sections/BusinessBasicInfoSection';
import { BusinessKnowledgeBaseSection } from './sections/BusinessKnowledgeBaseSection';

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
      {/* Business Basic Info */}
      <BusinessBasicInfoSection 
        businessData={businessData}
        setBusinessData={setBusinessData}
      />

      {/* Service Types Section */}
      <ServiceTypesSection />

      {/* Knowledge Base of the Booking Agent */}
      <BusinessKnowledgeBaseSection 
        businessData={businessData}
        setBusinessData={setBusinessData}
      />

      <button 
        onClick={handleUpdateProfile} 
        disabled={loading} 
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Business Information'}
      </button>
    </div>
  );
};
