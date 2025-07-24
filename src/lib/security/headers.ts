// Security Headers and Content Security Policy
export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  reportOnly: boolean;
  reportUri?: string;
}

export class SecurityHeaders {
  private static config: SecurityHeadersConfig = {
    enableCSP: true,
    enableHSTS: true,
    enableXFrameOptions: true,
    enableXContentTypeOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    reportOnly: false,
    reportUri: '/api/csp-report'
  };

  static getContentSecurityPolicy(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
      "frame-src 'self' https://youtube.com https://www.youtube.com",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];

    if (this.config.reportUri) {
      directives.push(`report-uri ${this.config.reportUri}`);
    }

    return directives.join('; ');
  }

  static getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.enableCSP) {
      const cspHeader = this.config.reportOnly ? 
        'Content-Security-Policy-Report-Only' : 
        'Content-Security-Policy';
      headers[cspHeader] = this.getContentSecurityPolicy();
    }

    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    if (this.config.enableXFrameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    if (this.config.enableXContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'speaker=()',
        'ambient-light-sensor=()',
        'accelerometer=()',
        'encrypted-media=()'
      ].join(', ');
    }

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['X-Download-Options'] = 'noopen';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';

    return headers;
  }

  static applyHeaders(request: Request): Headers {
    const headers = new Headers(request.headers);
    const securityHeaders = this.getSecurityHeaders();

    Object.entries(securityHeaders).forEach(([name, value]) => {
      headers.set(name, value);
    });

    return headers;
  }

  static createMetaTag(name: string, content: string): HTMLMetaElement {
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', name);
    meta.setAttribute('content', content);
    return meta;
  }

  static injectSecurityHeaders(): void {
    if (typeof document === 'undefined') return;

    const headers = this.getSecurityHeaders();
    const head = document.head;

    // Remove existing security meta tags
    const existingMetas = head.querySelectorAll('meta[http-equiv^="Content-Security-Policy"], meta[http-equiv="X-Frame-Options"], meta[http-equiv="X-Content-Type-Options"]');
    existingMetas.forEach(meta => meta.remove());

    // Add new security meta tags
    Object.entries(headers).forEach(([name, content]) => {
      if (name.startsWith('Content-Security-Policy') || 
          name === 'X-Frame-Options' || 
          name === 'X-Content-Type-Options') {
        const meta = this.createMetaTag(name, content);
        head.appendChild(meta);
      }
    });
  }

  static validateCSP(policy: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const directives = policy.split(';').map(d => d.trim());

    // Check for required directives
    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
    requiredDirectives.forEach(directive => {
      if (!directives.some(d => d.startsWith(directive))) {
        errors.push(`Missing required directive: ${directive}`);
      }
    });

    // Check for unsafe directives
    const unsafePatterns = ['unsafe-inline', 'unsafe-eval', '*'];
    directives.forEach(directive => {
      unsafePatterns.forEach(pattern => {
        if (directive.includes(pattern)) {
          errors.push(`Potentially unsafe directive: ${directive}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  static getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }

  // CSP Violation Reporting
  static handleCSPViolation(violationReport: any): void {
    console.warn('CSP Violation:', violationReport);
    
    // Log to security logger
    import('./logger').then(({ SecurityLogger }) => {
      const logger = new SecurityLogger();
      logger.logSecurityEvent('csp_violation', {
        blocked_uri: violationReport['blocked-uri'],
        violated_directive: violationReport['violated-directive'],
        original_policy: violationReport['original-policy'],
        source_file: violationReport['source-file'],
        line_number: violationReport['line-number'],
        column_number: violationReport['column-number']
      }, 'medium');
    });
  }

  // Initialize CSP violation reporting
  static initializeViolationReporting(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleCSPViolation({
        'blocked-uri': event.blockedURI,
        'violated-directive': event.violatedDirective,
        'original-policy': event.originalPolicy,
        'source-file': event.sourceFile,
        'line-number': event.lineNumber,
        'column-number': event.columnNumber
      });
    });
  }
}

// Auto-initialize security headers and violation reporting
if (typeof window !== 'undefined') {
  SecurityHeaders.injectSecurityHeaders();
  SecurityHeaders.initializeViolationReporting();
}