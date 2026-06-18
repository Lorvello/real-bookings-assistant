import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsData } from '@/hooks/useSettingsData';

interface SettingsContextType {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;        // a save is in progress
  isLoading: boolean;      // the initial fetch is in progress
  loadError: string | null;
  saveError: string | null;
  saveFields: (changes: Record<string, any>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Raw context exported so the no-auth visual harness can mount the real Settings
// components with mock data (no live Supabase / RLS), per the launch-ready-loop §7.
export { SettingsContext };
export type { SettingsContextType };

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
