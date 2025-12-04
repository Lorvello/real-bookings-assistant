import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsData } from '@/hooks/useSettingsData';

interface SettingsContextType {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: (customData?: any, showToast?: boolean) => Promise<boolean>;
  handleUpdateBusiness: (customData?: any, showToast?: boolean) => Promise<boolean>;
  handleBatchUpdate: (profileChanges: any, businessChanges: any) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const settingsData = useSettingsData();

  return (
    <SettingsContext.Provider value={settingsData}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
