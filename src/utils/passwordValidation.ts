// Password validation utility with consistent security standards
// Implements strong password requirements across all authentication forms

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-5 strength score
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const;

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  } else {
    score += 1;
    if (password.length >= 12) score += 1; // Bonus for longer passwords
  }

  // Uppercase check
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase check
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Numbers check
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special characters check
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  } else {
    score += 1;
  }

  // Common password patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /abc123/i,
    /admin/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns that are not secure');
      score = Math.max(0, score - 1);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(5, score),
  };
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Fair';
    case 4:
      return 'Good';
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'text-destructive';
    case 2:
      return 'text-amber-600';
    case 3:
      return 'text-yellow-600';
    case 4:
      return 'text-blue-600';
    case 5:
      return 'text-green-600';
    default:
      return 'text-muted-foreground';
  }
};