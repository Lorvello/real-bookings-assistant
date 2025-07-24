// Secure Session Management
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface SessionSecurityConfig {
  maxInactiveDuration: number;
  refreshThreshold: number;
  enableFingerprinting: boolean;
  secureStorage: boolean;
}

export class SessionManager {
  private config: SessionSecurityConfig = {
    maxInactiveDuration: 30 * 60 * 1000, // 30 minutes
    refreshThreshold: 5 * 60 * 1000, // 5 minutes
    enableFingerprinting: true,
    secureStorage: true
  };

  private activityTimer: number | null = null;
  private refreshTimer: number | null = null;
  private fingerprint: string | null = null;

  async createSecureSession(session: Session): Promise<void> {
    try {
      // Generate and store session fingerprint
      if (this.config.enableFingerprinting) {
        this.fingerprint = this.generateFingerprint();
        this.storeSecurely('session_fingerprint', this.fingerprint);
      }

      // Store session metadata
      this.storeSecurely('session_created_at', Date.now().toString());
      this.storeSecurely('last_activity', Date.now().toString());

      // Setup activity monitoring
      this.setupActivityMonitoring();
      
      // Setup auto-refresh
      this.setupAutoRefresh(session);

      console.log('Secure session created successfully');
    } catch (error) {
      console.error('Failed to create secure session:', error);
      throw error;
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      // Check if session exists
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        await this.destroySession();
        return false;
      }

      // Validate fingerprint if enabled
      if (this.config.enableFingerprinting) {
        const storedFingerprint = this.getSecurely('session_fingerprint');
        const currentFingerprint = this.generateFingerprint();
        
        if (storedFingerprint !== currentFingerprint) {
          console.warn('Session fingerprint mismatch - potential session hijacking');
          await this.destroySession();
          return false;
        }
      }

      // Check session age and activity
      const lastActivity = parseInt(this.getSecurely('last_activity') || '0');
      const now = Date.now();
      
      if (now - lastActivity > this.config.maxInactiveDuration) {
        console.warn('Session expired due to inactivity');
        await this.destroySession();
        return false;
      }

      // Update last activity
      this.updateActivity();
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      await this.destroySession();
      return false;
    }
  }

  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('Failed to refresh session:', error);
        await this.destroySession();
        return false;
      }

      // Update activity timestamp
      this.updateActivity();
      console.log('Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      await this.destroySession();
      return false;
    }
  }

  async destroySession(session?: any): Promise<void> {
    try {
      // Clear timers
      if (this.activityTimer) {
        clearTimeout(this.activityTimer);
        this.activityTimer = null;
      }
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Clear stored session data
      this.clearSecureStorage();

      // Reset fingerprint
      this.fingerprint = null;

      console.log('Session destroyed successfully');
    } catch (error) {
      console.error('Failed to destroy session:', error);
    }
  }

  private setupActivityMonitoring(): void {
    // Monitor user activity
    const activityEvents = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      this.updateActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Setup inactivity timer
    this.resetActivityTimer();
  }

  private setupAutoRefresh(session: Session): void {
    const setupRefreshTimer = () => {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      // Calculate time until refresh needed
      const expiresAt = new Date(session.expires_at || 0).getTime();
      const refreshAt = expiresAt - this.config.refreshThreshold;
      const delay = Math.max(0, refreshAt - Date.now());

      this.refreshTimer = window.setTimeout(async () => {
        const success = await this.refreshSession();
        if (success) {
          setupRefreshTimer(); // Setup next refresh
        }
      }, delay);
    };

    setupRefreshTimer();
  }

  private updateActivity(): void {
    this.storeSecurely('last_activity', Date.now().toString());
    this.resetActivityTimer();
  }

  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = window.setTimeout(async () => {
      console.warn('Session expired due to inactivity');
      await this.destroySession();
      // Redirect to login or show timeout modal
      window.location.href = '/login';
    }, this.config.maxInactiveDuration);
  }

  private generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform
    ];

    return btoa(components.join('|')).slice(0, 32);
  }

  private storeSecurely(key: string, value: string): void {
    if (this.config.secureStorage) {
      try {
        // Use sessionStorage for security-sensitive data
        sessionStorage.setItem(`secure_${key}`, value);
      } catch (error) {
        console.warn('Failed to store securely:', error);
      }
    }
  }

  private getSecurely(key: string): string | null {
    if (this.config.secureStorage) {
      try {
        return sessionStorage.getItem(`secure_${key}`);
      } catch (error) {
        console.warn('Failed to retrieve securely:', error);
        return null;
      }
    }
    return null;
  }

  private clearSecureStorage(): void {
    if (this.config.secureStorage) {
      try {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('secure_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear secure storage:', error);
      }
    }
  }
}