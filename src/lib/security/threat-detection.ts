// Threat Detection and Security Monitoring
import { SecurityLogger } from './logger';

export interface ThreatRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  checkFunction: (context: ThreatContext) => ThreatResult;
}

export interface ThreatContext {
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  requestPath?: string;
  requestMethod?: string;
  requestBody?: any;
  headers?: Record<string, string>;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ThreatResult {
  detected: boolean;
  confidence: number; // 0-1
  indicators: string[];
  metadata?: Record<string, any>;
}

export class ThreatDetector {
  private rules: Map<string, ThreatRule> = new Map();
  private logger: SecurityLogger;
  private detectionHistory: Map<string, number[]> = new Map();

  constructor() {
    this.logger = new SecurityLogger();
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // SQL Injection Detection
    this.addRule({
      id: 'sql_injection',
      name: 'SQL Injection Detection',
      description: 'Detects potential SQL injection attempts',
      severity: 'high',
      enabled: true,
      checkFunction: (context) => this.checkSQLInjection(context)
    });

    // XSS Detection
    this.addRule({
      id: 'xss_attack',
      name: 'XSS Attack Detection',
      description: 'Detects potential cross-site scripting attempts',
      severity: 'high',
      enabled: true,
      checkFunction: (context) => this.checkXSS(context)
    });

    // Brute Force Detection
    this.addRule({
      id: 'brute_force',
      name: 'Brute Force Detection',
      description: 'Detects potential brute force attacks',
      severity: 'medium',
      enabled: true,
      checkFunction: (context) => this.checkBruteForce(context)
    });

    // Suspicious User Agent
    this.addRule({
      id: 'suspicious_user_agent',
      name: 'Suspicious User Agent',
      description: 'Detects suspicious or malicious user agents',
      severity: 'low',
      enabled: true,
      checkFunction: (context) => this.checkSuspiciousUserAgent(context)
    });

    // Path Traversal
    this.addRule({
      id: 'path_traversal',
      name: 'Path Traversal Detection',
      description: 'Detects potential path traversal attempts',
      severity: 'medium',
      enabled: true,
      checkFunction: (context) => this.checkPathTraversal(context)
    });

    // Command Injection
    this.addRule({
      id: 'command_injection',
      name: 'Command Injection Detection',
      description: 'Detects potential command injection attempts',
      severity: 'high',
      enabled: true,
      checkFunction: (context) => this.checkCommandInjection(context)
    });

    // Rate Limiting Violations
    this.addRule({
      id: 'rate_limit_violation',
      name: 'Rate Limit Violation',
      description: 'Detects excessive request rates',
      severity: 'medium',
      enabled: true,
      checkFunction: (context) => this.checkRateLimit(context)
    });
  }

  addRule(rule: ThreatRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  async analyzeRequest(context: ThreatContext): Promise<ThreatResult[]> {
    const results: ThreatResult[] = [];

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      try {
        const result = rule.checkFunction(context);
        
        if (result.detected) {
          results.push(result);
          
          // Log the threat
          await this.logger.logThreatDetection({
            type: rule.name,
            severity: rule.severity,
            indicators: result.indicators,
            metadata: {
              ruleId,
              confidence: result.confidence,
              context: this.sanitizeContext(context),
              ...result.metadata
            }
          });
        }
      } catch (error) {
        console.error(`Error executing threat rule ${ruleId}:`, error);
      }
    }

    return results;
  }

  private checkSQLInjection(context: ThreatContext): ThreatResult {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /'(\s*(OR|AND)\s*'?\w*'?\s*=\s*'?\w*'?)/i,
      /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
      /\/\*.*\*\//,
      /--\s/,
      /\b(WAITFOR|DELAY|SLEEP)\b/i
    ];

    const indicators: string[] = [];
    let confidence = 0;

    const textToCheck = [
      context.requestPath,
      JSON.stringify(context.requestBody || {}),
      ...Object.values(context.headers || {})
    ].join(' ');

    for (const pattern of sqlPatterns) {
      if (pattern.test(textToCheck)) {
        indicators.push(`SQL injection pattern detected: ${pattern.source}`);
        confidence += 0.3;
      }
    }

    return {
      detected: confidence > 0.5,
      confidence: Math.min(confidence, 1),
      indicators
    };
  }

  private checkXSS(context: ThreatContext): ThreatResult {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[\s\S]*?>/i,
      /<object[\s\S]*?>/i,
      /<embed[\s\S]*?>/i,
      /expression\s*\(/i,
      /@import/i
    ];

    const indicators: string[] = [];
    let confidence = 0;

    const textToCheck = [
      context.requestPath,
      JSON.stringify(context.requestBody || {}),
      ...Object.values(context.headers || {})
    ].join(' ');

    for (const pattern of xssPatterns) {
      if (pattern.test(textToCheck)) {
        indicators.push(`XSS pattern detected: ${pattern.source}`);
        confidence += 0.4;
      }
    }

    return {
      detected: confidence > 0.3,
      confidence: Math.min(confidence, 1),
      indicators
    };
  }

  private checkBruteForce(context: ThreatContext): ThreatResult {
    const key = context.ip || context.userId || 'unknown';
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const maxAttempts = 10;

    // Get or create history for this key
    let history = this.detectionHistory.get(key) || [];
    
    // Remove old entries
    history = history.filter(timestamp => now - timestamp < timeWindow);
    
    // Add current attempt
    history.push(now);
    this.detectionHistory.set(key, history);

    const attemptCount = history.length;
    const confidence = Math.min(attemptCount / maxAttempts, 1);

    return {
      detected: attemptCount >= maxAttempts,
      confidence,
      indicators: attemptCount >= maxAttempts ? 
        [`${attemptCount} requests in ${timeWindow}ms from ${key}`] : [],
      metadata: { attemptCount, timeWindow }
    };
  }

  private checkSuspiciousUserAgent(context: ThreatContext): ThreatResult {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /^$/  // Empty user agent
    ];

    const userAgent = context.userAgent || '';
    const indicators: string[] = [];
    let confidence = 0;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        indicators.push(`Suspicious user agent pattern: ${pattern.source}`);
        confidence += 0.2;
      }
    }

    // Check for extremely short or long user agents
    if (userAgent.length < 10 || userAgent.length > 500) {
      indicators.push(`Unusual user agent length: ${userAgent.length}`);
      confidence += 0.1;
    }

    return {
      detected: confidence > 0.15,
      confidence: Math.min(confidence, 1),
      indicators,
      metadata: { userAgent }
    };
  }

  private checkPathTraversal(context: ThreatContext): ThreatResult {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\]/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\./g
    ];

    const path = context.requestPath || '';
    const indicators: string[] = [];
    let confidence = 0;

    for (const pattern of pathTraversalPatterns) {
      const matches = path.match(pattern);
      if (matches && matches.length > 0) {
        indicators.push(`Path traversal pattern detected: ${pattern.source} (${matches.length} occurrences)`);
        confidence += matches.length * 0.3;
      }
    }

    return {
      detected: confidence > 0.2,
      confidence: Math.min(confidence, 1),
      indicators,
      metadata: { path }
    };
  }

  private checkCommandInjection(context: ThreatContext): ThreatResult {
    const commandPatterns = [
      /[;&|`$()]/,
      /\b(cat|ls|pwd|whoami|id|uname|netstat|ps|wget|curl)\b/i,
      /\$\{.*\}/,
      /`.*`/,
      /\$\(.*\)/
    ];

    const indicators: string[] = [];
    let confidence = 0;

    const textToCheck = [
      context.requestPath,
      JSON.stringify(context.requestBody || {}),
      ...Object.values(context.headers || {})
    ].join(' ');

    for (const pattern of commandPatterns) {
      if (pattern.test(textToCheck)) {
        indicators.push(`Command injection pattern detected: ${pattern.source}`);
        confidence += 0.4;
      }
    }

    return {
      detected: confidence > 0.3,
      confidence: Math.min(confidence, 1),
      indicators
    };
  }

  private checkRateLimit(context: ThreatContext): ThreatResult {
    const key = `rate_${context.ip || context.userId || 'unknown'}`;
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute
    const maxRequests = 60; // 60 requests per minute

    let history = this.detectionHistory.get(key) || [];
    history = history.filter(timestamp => now - timestamp < timeWindow);
    history.push(now);
    this.detectionHistory.set(key, history);

    const requestCount = history.length;
    const confidence = Math.min(requestCount / maxRequests, 1);

    return {
      detected: requestCount > maxRequests,
      confidence,
      indicators: requestCount > maxRequests ? 
        [`Rate limit exceeded: ${requestCount} requests in ${timeWindow}ms`] : [],
      metadata: { requestCount, maxRequests, timeWindow }
    };
  }

  private sanitizeContext(context: ThreatContext): Partial<ThreatContext> {
    return {
      requestPath: context.requestPath,
      requestMethod: context.requestMethod,
      timestamp: context.timestamp,
      // Don't include sensitive data like full request body or headers
    };
  }

  getDetectionStats(): any {
    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(rule => rule.enabled).length,
      detectionHistorySize: this.detectionHistory.size
    };
  }

  clearHistory(): void {
    this.detectionHistory.clear();
  }
}

// Singleton instance
export const threatDetector = new ThreatDetector();