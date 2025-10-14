import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/utils/inputSanitization';

describe('UTF-8 Character Support', () => {
  it('should handle emoji in customer names', () => {
    const name = '👨‍💼 John Doe 🎉';
    const result = sanitizeText(name);
    expect(result.sanitized).toContain('John Doe');
  });

  it('should handle Chinese characters', () => {
    const name = '李明';
    const result = sanitizeText(name);
    expect(result.sanitized).toBe(name);
  });

  it('should handle accented characters', () => {
    const name = 'François Müller';
    const result = sanitizeText(name);
    expect(result.sanitized).toBe(name);
  });
});
