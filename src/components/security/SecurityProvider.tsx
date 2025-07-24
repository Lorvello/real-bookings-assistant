// Security Context Provider
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { initializeSecurity } from '@/lib/security';

interface SecurityContextType {
  securityState: any;
  secureLogin: (email: string, password: string) => Promise<any>;
  secureSignup: (email: string, password: string, metadata?: any) => Promise<any>;
  analyzeRequest: (requestData: any) => Promise<any[]>;
  validateInput: (input: string, type?: 'email' | 'text' | 'url' | 'phone') => boolean;
  checkPasswordStrength: (password: string) => any;
  generateSecureToken: (length?: number) => string;
  clearSecurityState: () => Promise<void>;
  getSecurityHeaders: () => Record<string, string>;
  isSecure: boolean;
  hasThreats: boolean;
  csrfToken: string | null;
  sessionValid: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const security = useSecurity();

  useEffect(() => {
    // Initialize security features when provider mounts
    initializeSecurity();
  }, []);

  return (
    <SecurityContext.Provider value={security}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurityContext = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};