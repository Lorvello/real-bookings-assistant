
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

      {/* Note about Service Types */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
        <h3 className="text-cyan-300 font-medium mb-2">Service Types Management</h3>
        <p className="text-slate-400 text-sm">
          Service types are managed in the Calendar tab under Settings. This centralizes all calendar-related configurations including services, availability, and booking settings.
        </p>
      </div>

      <button 
        onClick={handleUpdateProfile} 
        disabled={loading} 
        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Business Information'}
      </button>
    </div>
  );
};
