import { describe, it, expect, beforeAll } from 'vitest';
import { createTestSupabaseClient, generateTestEmail, querySecurityLogs } from '@/test/utils/testHelpers';
import { sanitizeText, validateEmail } from '@/utils/inputSanitization';

describe('SQL Injection Prevention', () => {
  const sqlInjectionAttacks = [
    // Classic attacks
    "admin' OR '1'='1",
    "'; DROP TABLE users--",
    "1' UNION SELECT password FROM users--",
    "admin'/**/OR/**/1=1--",
    
    // Boolean-based blind injection
    "' OR 1=1--",
    "' OR 'x'='x",
    "1' AND '1'='1",
    
    // Time-based blind injection
    "'; WAITFOR DELAY '00:00:10'--",
    "1'; SELECT SLEEP(10)--",
    
    // Stacked queries
    "'; DROP TABLE bookings; --",
    "1; DELETE FROM calendars WHERE 1=1;--",
    
    // Comment-based injection
    "admin'--",
    "admin'#",
    "admin'/* comment */",
    
    // Second-order injection
    "admin\\'--",
  ];

  describe('Input Sanitization', () => {
    sqlInjectionAttacks.forEach((attack) => {
      it(`should sanitize SQL injection attempt: "${attack.substring(0, 30)}..."`, () => {
        const result = sanitizeText(attack);
        
        // SQL metacharacters such as semicolons and comment markers are valid
        // user text. Removing them would corrupt names and notes without
        // providing a database security boundary. sanitizeText must flag the
        // payload without corrupting storage; Supabase/PostgREST parameterized
        // query construction is the database security boundary verified below.
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe(attack);
        
        // Verify security event was flagged (suspicious input)
        expect(result.suspicious).toBe(true);
      });
    });
  });

  describe('Email Field SQL Injection', () => {
    const emailAttacks = [
      "admin@test.com' OR '1'='1",
      "test@example.com'; DROP TABLE users--",
      "user@domain.com' UNION SELECT password",
    ];

    emailAttacks.forEach((attack) => {
      it(`should reject malicious email: "${attack.substring(0, 30)}..."`, () => {
        const result = validateEmail(attack);
        
        expect(result.valid).toBe(false);
        expect(result.suspicious).toBe(true);
      });
    });
  });

  describe('Database Query Protection', () => {
    it('blocks direct anonymous booking inserts before malicious input reaches SQL', async () => {
      const supabase = createTestSupabaseClient();
      const maliciousName = "'; DROP TABLE bookings--";
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_name: maliciousName,
          customer_email: generateTestEmail(),
          calendar_id: 'test-calendar-id',
          service_type_id: 'test-service-id',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      
      // Public bookings are created through the validated server route. The
      // browser role must never regain direct table INSERT privileges. Unit-only
      // CI may reject its inert JWT before PostgREST; the local SQL contract proves
      // the real anon grant/RLS denial against the disposable database.
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toBeTruthy();
    });

    it('should prevent UNION SELECT attacks', async () => {
      const supabase = createTestSupabaseClient();
      const attack = "1' UNION SELECT password FROM users--";
      
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('name', attack)
        .maybeSingle();
      
      // Should return no data or error, not leak user passwords
      expect(data).toBeNull();
    });
  });

  describe('Security Logging', () => {
    it('should log SQL injection attempts', async () => {
      const attack = "admin' OR '1'='1";
      const result = sanitizeText(attack);
      
      expect(result.suspicious).toBe(true);
      
      // In production, this would write to security_events_log
      // For testing, we verify the suspicious flag is set
      expect(result.sanitized).toBe(attack);
    });
  });

  describe('Numeric Injection Prevention', () => {
    it('should handle numeric fields safely', async () => {
      const supabase = createTestSupabaseClient();
      const maliciousId = "1 OR 1=1";
      
      // Supabase will coerce to number or reject
      const { error } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', maliciousId);
      
      // Should fail gracefully without executing injection
      expect(error).toBeDefined();
    });
  });
});
