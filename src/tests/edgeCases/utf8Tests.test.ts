import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText } from '@/utils/inputSanitization';

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

  it("preserves apostrophes, ampersands, and slashes for storage", () => {
    const businessName = "O'Connor & Sons / North";
    const result = sanitizeText(businessName);

    expect(result.sanitized).toBe(businessName);
    expect(result.value).toBe(businessName);
  });

  it('encodes only at an HTML sink and round-trips back to the stored text', () => {
    const stored = sanitizeText("O'Connor & Sons / North").sanitized;
    const encodedForHtml = sanitizeHtml(stored);
    const sink = document.createElement('textarea');
    sink.innerHTML = encodedForHtml;

    expect(encodedForHtml).toBe('O&#x27;Connor &amp; Sons &#x2F; North');
    expect(sink.value).toBe(stored);
  });
});
