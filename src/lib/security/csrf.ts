// CSRF Protection Utilities
import { supabase } from '@/integrations/supabase/client';

export interface CSRFConfig {
  tokenLength: number;
  headerName: string;
  cookieName: string;
  storageKey: string;
  expiry: number; // in milliseconds
}

export class CSRFProtection {
  private static config: CSRFConfig = {
    tokenLength: 32,
    headerName: 'X-CSRF-Token',
    cookieName: 'csrf_token',
    storageKey: 'csrf_token',
    expiry: 60 * 60 * 1000 // 1 hour
  };

  private static currentToken: string | null = null;
  private static tokenExpiry: number | null = null;

  static generateToken(): string {
    const array = new Uint8Array(this.config.tokenLength);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static async getToken(): Promise<string> {
    // Check if current token is still valid
    if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.currentToken;
    }

    // Generate new token
    this.currentToken = this.generateToken();
    this.tokenExpiry = Date.now() + this.config.expiry;

    // Store token securely
    try {
      sessionStorage.setItem(this.config.storageKey, JSON.stringify({
        token: this.currentToken,
        expiry: this.tokenExpiry
      }));
    } catch (error) {
      console.warn('Failed to store CSRF token:', error);
    }

    return this.currentToken;
  }

  static validateToken(token: string): boolean {
    if (!token || !this.currentToken) {
      return false;
    }

    // Check if token matches and is not expired
    const isValid = token === this.currentToken && 
                   this.tokenExpiry && 
                   Date.now() < this.tokenExpiry;

    return isValid;
  }

  static async attachTokenToRequest(requestInit: RequestInit = {}): Promise<RequestInit> {
    const token = await this.getToken();
    
    return {
      ...requestInit,
      headers: {
        ...requestInit.headers,
        [this.config.headerName]: token
      }
    };
  }

  static getTokenFromStorage(): string | null {
    try {
      const stored = sessionStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiry && Date.now() < parsed.expiry) {
          this.currentToken = parsed.token;
          this.tokenExpiry = parsed.expiry;
          return parsed.token;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve CSRF token from storage:', error);
    }
    
    return null;
  }

  static clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
    
    try {
      sessionStorage.removeItem(this.config.storageKey);
    } catch (error) {
      console.warn('Failed to clear CSRF token:', error);
    }
  }

  static createSecureForm(formElement: HTMLFormElement): void {
    // Remove any existing CSRF input
    const existingInput = formElement.querySelector('input[name="csrf_token"]');
    if (existingInput) {
      existingInput.remove();
    }

    // Add CSRF token as hidden input
    this.getToken().then(token => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'csrf_token';
      input.value = token;
      formElement.appendChild(input);
    });
  }

  static async protectSupabaseRequest(requestConfig: any): Promise<any> {
    const token = await this.getToken();
    
    return {
      ...requestConfig,
      headers: {
        ...requestConfig.headers,
        [this.config.headerName]: token
      }
    };
  }

  // Initialize CSRF protection
  static initialize(): void {
    // Try to restore token from storage
    this.getTokenFromStorage();

    // Set up automatic token refresh
    setInterval(() => {
      if (this.tokenExpiry && Date.now() > this.tokenExpiry - (5 * 60 * 1000)) {
        // Refresh token 5 minutes before expiry
        this.getToken();
      }
    }, 60 * 1000); // Check every minute

    // Clear token on page unload
    window.addEventListener('beforeunload', () => {
      this.clearToken();
    });

    // Intercept fetch requests to add CSRF token
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Only add CSRF token to same-origin requests
      const url = typeof input === 'string' ? input : input.toString();
      const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
      
      if (isSameOrigin && init?.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase())) {
        init = await this.attachTokenToRequest(init);
      }
      
      return originalFetch(input, init);
    };
  }
}

// Auto-initialize CSRF protection
if (typeof window !== 'undefined') {
  CSRFProtection.initialize();
}