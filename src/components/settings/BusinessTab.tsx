
import React from 'react';
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

      {/* Knowledge Base of the Booking Agent */}
      <BusinessKnowledgeBaseSection 
        businessData={businessData}
        setBusinessData={setBusinessData}
      />

      <button 
        onClick={handleUpdateProfile} 
        disabled={loading} 
        className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Business Information'}
      </button>
    </div>
  );
};
