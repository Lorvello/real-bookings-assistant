// Password validation utility with consistent security standards
// Implements strong password requirements across all authentication forms

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  score: number; // 0-5 strength score
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12, // Increased from 8 for enterprise security
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxRepeatedChars: 3,
  preventSequentialChars: true,
  preventKeyboardPatterns: true,
  checkCommonPasswords: true
} as const;

// Common passwords dictionary (subset for client-side)
const COMMON_PASSWORDS = [
  'password123', 'admin123', 'welcome123', 'qwerty123', 'letmein123',
  '123456789', 'password1', 'password!', 'admin1234', 'welcome1',
  'p@ssw0rd', 'passw0rd', 'password12', 'qwertyuiop', 'administrator'
];

// Keyboard pattern detection
const KEYBOARD_PATTERNS = [
  'qwerty', 'asdfgh', 'zxcvbn', '12345', 'qwertz', 'azerty'
];

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

  // Common password check
  if (PASSWORD_REQUIREMENTS.checkCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
      errors.push('Password is too common and easily guessable');
      score = Math.max(0, score - 1);
    }
  }

  // Keyboard pattern check
  if (PASSWORD_REQUIREMENTS.preventKeyboardPatterns) {
    const lowerPassword = password.toLowerCase();
    if (KEYBOARD_PATTERNS.some(pattern => lowerPassword.includes(pattern))) {
      errors.push('Password contains keyboard patterns that are not secure');
      score = Math.max(0, score - 1);
    }
  }

  // Sequential characters check
  if (PASSWORD_REQUIREMENTS.preventSequentialChars) {
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password) ||
        /012|123|234|345|456|567|678|789|890/.test(password)) {
      errors.push('Password contains sequential characters');
      score = Math.max(0, score - 1);
    }
  }

  // Repeated characters check
  if (PASSWORD_REQUIREMENTS.maxRepeatedChars) {
    const repeatedPattern = new RegExp(`(.)\\1{${PASSWORD_REQUIREMENTS.maxRepeatedChars},}`);
    if (repeatedPattern.test(password)) {
      errors.push(`Password has too many repeated characters (max ${PASSWORD_REQUIREMENTS.maxRepeatedChars})`);
      score = Math.max(0, score - 1);
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