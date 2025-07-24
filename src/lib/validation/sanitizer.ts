// Input Sanitization Utilities
import DOMPurify from 'isomorphic-dompurify';

export interface SanitizationConfig {
  allowHtml: boolean;
  maxLength: number;
  stripWhitespace: boolean;
  removeSpecialChars: boolean;
  allowedHtmlTags?: string[];
  allowedAttributes?: string[];
}

export class InputSanitizer {
  private static defaultConfig: SanitizationConfig = {
    allowHtml: false,
    maxLength: 1000,
    stripWhitespace: true,
    removeSpecialChars: false
  };

  static sanitizeString(
    input: string | undefined | null, 
    config: Partial<SanitizationConfig> = {}
  ): string {
    if (!input) return '';
    
    const finalConfig = { ...this.defaultConfig, ...config };
    let sanitized = input;

    // Basic length check
    if (sanitized.length > finalConfig.maxLength) {
      sanitized = sanitized.substring(0, finalConfig.maxLength);
    }

    // Strip whitespace
    if (finalConfig.stripWhitespace) {
      sanitized = sanitized.trim();
    }

    // HTML sanitization
    if (finalConfig.allowHtml) {
      const purifyConfig: any = {};
      
      if (finalConfig.allowedHtmlTags) {
        purifyConfig.ALLOWED_TAGS = finalConfig.allowedHtmlTags;
      }
      
      if (finalConfig.allowedAttributes) {
        purifyConfig.ALLOWED_ATTR = finalConfig.allowedAttributes;
      }
      
      sanitized = DOMPurify.sanitize(sanitized, purifyConfig) as unknown as string;
    } else {
      // Strip all HTML
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    }

    // Remove special characters if needed
    if (finalConfig.removeSpecialChars) {
      sanitized = sanitized.replace(/[<>{}[\]\\\/]/g, '');
    }

    return sanitized;
  }

  static sanitizeEmail(email: string | undefined | null): string {
    if (!email) return '';
    
    let sanitized = email.trim().toLowerCase();
    
    // Remove any HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  }

  static sanitizePhone(phone: string | undefined | null): string {
    if (!phone) return '';
    
    let sanitized = phone.trim();
    
    // Remove HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Remove all non-digit characters except + at the beginning
    sanitized = sanitized.replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (sanitized.includes('+')) {
      const plusIndex = sanitized.indexOf('+');
      if (plusIndex === 0) {
        sanitized = '+' + sanitized.slice(1).replace(/\+/g, '');
      } else {
        sanitized = sanitized.replace(/\+/g, '');
      }
    }
    
    return sanitized;
  }

  static sanitizeUrl(url: string | undefined | null): string {
    if (!url) return '';
    
    let sanitized = url.trim();
    
    // Remove HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Validate URL format
    try {
      const urlObj = new URL(sanitized);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      
      return urlObj.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  static sanitizeSlug(slug: string | undefined | null): string {
    if (!slug) return '';
    
    let sanitized = slug.trim().toLowerCase();
    
    // Remove HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Replace spaces and invalid characters with hyphens
    sanitized = sanitized.replace(/[^a-z0-9-]/g, '-');
    
    // Remove multiple consecutive hyphens
    sanitized = sanitized.replace(/-+/g, '-');
    
    // Remove leading and trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, '');
    
    return sanitized;
  }

  static sanitizeNumericString(input: string | undefined | null): string {
    if (!input) return '';
    
    let sanitized = input.trim();
    
    // Remove HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Keep only digits, decimal point, and minus sign
    sanitized = sanitized.replace(/[^0-9.-]/g, '');
    
    return sanitized;
  }

  static sanitizeFileName(fileName: string | undefined | null): string {
    if (!fileName) return '';
    
    let sanitized = fileName.trim();
    
    // Remove HTML
    sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) as unknown as string;
    
    // Remove path separators and dangerous characters
    sanitized = sanitized.replace(/[\/\\:*?"<>|]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.lastIndexOf('.');
      if (ext > 0) {
        const name = sanitized.substring(0, ext);
        const extension = sanitized.substring(ext);
        sanitized = name.substring(0, 255 - extension.length) + extension;
      } else {
        sanitized = sanitized.substring(0, 255);
      }
    }
    
    return sanitized;
  }

  static sanitizeObject<T extends Record<string, any>>(
    obj: T, 
    fieldConfigs: Partial<Record<keyof T, SanitizationConfig>>
  ): T {
    const sanitized = { ...obj };
    
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        const config = fieldConfigs[key as keyof T];
        sanitized[key as keyof T] = this.sanitizeString(value, config) as T[keyof T];
      }
    }
    
    return sanitized;
  }

  static sanitizeArray(
    arr: string[], 
    config: Partial<SanitizationConfig> = {}
  ): string[] {
    return arr.map(item => this.sanitizeString(item, config));
  }

  static removeXSSVectors(input: string): string {
    if (!input) return '';
    
    // Remove common XSS vectors
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi
    ];
    
    let sanitized = input;
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  static validateAndSanitizeJson(jsonString: string): any {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Recursively sanitize string values in the JSON
      const sanitizeJsonValue = (value: any): any => {
        if (typeof value === 'string') {
          return this.sanitizeString(value);
        } else if (Array.isArray(value)) {
          return value.map(sanitizeJsonValue);
        } else if (typeof value === 'object' && value !== null) {
          const sanitizedObj: any = {};
          for (const [key, val] of Object.entries(value)) {
            sanitizedObj[this.sanitizeString(key)] = sanitizeJsonValue(val);
          }
          return sanitizedObj;
        }
        return value;
      };
      
      return sanitizeJsonValue(parsed);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}
