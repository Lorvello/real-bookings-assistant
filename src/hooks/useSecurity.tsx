// Security Hook for React Components
import { useEffect, useState, useCallback } from 'react';
import { 
  AuthSecurity, 
  SecurityLogger, 
  threatDetector, 
  CSRFProtection,
  SecurityUtils 
} from '@/lib/security';
import { useToast } from '@/hooks/use-toast';

export interface SecurityState {
  isSecure: boolean;
  threats: any[];
  csrfToken: string | null;
  sessionValid: boolean;
  loading: boolean;
}

export const useSecurity = () => {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isSecure: true,
    threats: [],
    csrfToken: null,
    sessionValid: false,
    loading: true
  });

  const { toast } = useToast();
  const logger = new SecurityLogger();

  // Initialize security monitoring
  useEffect(() => {
    initializeSecurity();
  }, []);

  const initializeSecurity = async () => {
    try {
      // Get CSRF token
      const token = await CSRFProtection.getToken();
      
      // Check session validity (if applicable)
      // This would depend on your authentication implementation
      
      setSecurityState(prev => ({
        ...prev,
        csrfToken: token,
        sessionValid: true, // Update based on actual session check
        loading: false
      }));

      await logger.logSecurityEvent('security_initialized', {
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to initialize security:', error);
      setSecurityState(prev => ({
        ...prev,
        isSecure: false,
        loading: false
      }));
    }
  };

  // Secure login wrapper
  const secureLogin = useCallback(async (email: string, password: string) => {
    try {
      const clientInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const result = await AuthSecurity.secureSignIn(email, password, clientInfo);
      
      // Update CSRF token after successful login
      const newToken = await CSRFProtection.getToken();
      setSecurityState(prev => ({
        ...prev,
        csrfToken: newToken,
        sessionValid: true
      }));

      toast({
        title: "Login Successful",
        description: "You have been securely logged in.",
        variant: "default"
      });

      return result;
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Secure signup wrapper
  const secureSignup = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      const result = await AuthSecurity.secureSignUp(email, password, metadata);
      
      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account.",
        variant: "default"
      });

      return result;
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  // Analyze request for threats
  const analyzeRequest = useCallback(async (requestData: any) => {
    try {
      const context = {
        userAgent: navigator.userAgent,
        requestPath: requestData.path,
        requestMethod: requestData.method,
        requestBody: requestData.body,
        headers: requestData.headers,
        timestamp: Date.now(),
        metadata: requestData.metadata
      };

      const threats = await threatDetector.analyzeRequest(context);
      
      if (threats.length > 0) {
        setSecurityState(prev => ({
          ...prev,
          threats: [...prev.threats, ...threats],
          isSecure: threats.every(t => t.confidence < 0.7)
        }));

        // Show warning for high-confidence threats
        const highConfidenceThreats = threats.filter(t => t.confidence >= 0.7);
        if (highConfidenceThreats.length > 0) {
          toast({
            title: "Security Warning",
            description: "Suspicious activity detected. Please verify your actions.",
            variant: "destructive"
          });
        }
      }

      return threats;
    } catch (error) {
      console.error('Threat analysis failed:', error);
      return [];
    }
  }, [toast]);

  // Validate and sanitize input
  const validateInput = useCallback((input: string, type: 'email' | 'text' | 'url' | 'phone' = 'text') => {
    try {
      switch (type) {
        case 'email':
          if (!SecurityUtils.isValidEmail(input)) {
            throw new Error('Invalid email format');
          }
          break;
        case 'url':
          try {
            new URL(input);
          } catch {
            throw new Error('Invalid URL format');
          }
          break;
        case 'phone':
          if (!/^\+?[1-9]\d{1,14}$/.test(input.replace(/\s/g, ''))) {
            throw new Error('Invalid phone number format');
          }
          break;
      }
      
      return true;
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Check password strength
  const checkPasswordStrength = useCallback((password: string) => {
    const result = SecurityUtils.checkPasswordStrength(password);
    
    if (result.score < 4) {
      toast({
        title: "Weak Password",
        description: result.feedback.join('. '),
        variant: "destructive"
      });
    }
    
    return result;
  }, [toast]);

  // Generate secure token
  const generateSecureToken = useCallback((length: number = 32) => {
    return SecurityUtils.generateSecureToken(length);
  }, []);

  // Clear security state (for logout)
  const clearSecurityState = useCallback(async () => {
    CSRFProtection.clearToken();
    setSecurityState({
      isSecure: true,
      threats: [],
      csrfToken: null,
      sessionValid: false,
      loading: false
    });

    await logger.logSecurityEvent('security_cleared', {
      timestamp: Date.now()
    });
  }, [logger]);

  // Get security headers for requests
  const getSecurityHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    
    if (securityState.csrfToken) {
      headers['X-CSRF-Token'] = securityState.csrfToken;
    }
    
    headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return headers;
  }, [securityState.csrfToken]);

  return {
    // State
    securityState,
    
    // Methods
    secureLogin,
    secureSignup,
    analyzeRequest,
    validateInput,
    checkPasswordStrength,
    generateSecureToken,
    clearSecurityState,
    getSecurityHeaders,
    
    // Utilities
    isSecure: securityState.isSecure,
    hasThreats: securityState.threats.length > 0,
    csrfToken: securityState.csrfToken,
    sessionValid: securityState.sessionValid
  };
};