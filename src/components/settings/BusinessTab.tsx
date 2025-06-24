
import React from 'react';
import { BusinessBasicInfoSection } from './sections/BusinessBasicInfoSection';
import { BusinessKnowledgeBaseSection } from './sections/BusinessKnowledgeBaseSection';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      {/* Save Button */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <Save className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-white font-medium">Save Changes</p>
            <p className="text-gray-400 text-sm">Save your business information</p>
          </div>
        </div>
        <Button
          onClick={handleUpdateProfile}
          disabled={loading}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Business Information'}
        </Button>
      </div>

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
    </div>
  );
};
