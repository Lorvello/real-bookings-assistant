// Input sanitization utilities for XSS prevention and data cleaning
// Provides consistent sanitization across all user inputs

export const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  
  // Basic HTML entity encoding to prevent XSS
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  // Remove potential script tags and dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // Basic email sanitization - remove potentially dangerous characters
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '');
};

export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Keep only numbers, spaces, hyphens, parentheses, and plus signs
  return phone.replace(/[^\d\s\-\(\)\+]/g, '').trim();
};

export const sanitizeBusinessName = (name: string): string => {
  if (!name) return '';
  
  // Allow letters, numbers, spaces, and common business punctuation
  return sanitizeString(name).replace(/[^\w\s\-&.,]/g, '').trim();
};

export const sanitizeUserInput = (input: string, type: 'text' | 'email' | 'phone' | 'business' = 'text'): string => {
  switch (type) {
    case 'email':
      return sanitizeEmail(input);
    case 'phone':
      return sanitizePhoneNumber(input);
    case 'business':
      return sanitizeBusinessName(input);
    case 'text':
    default:
      return sanitizeString(input);
  }
};
