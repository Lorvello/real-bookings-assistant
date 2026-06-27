import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePassword, getPasswordStrengthColor } from '@/utils/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  showStrengthIndicator?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  showStrengthIndicator = true,
  required = false,
  error,
  className,
}) => {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const validation = validatePassword(value);

  // Resolve label/placeholder: a caller-supplied value wins (including '' to hide
  // the label); otherwise fall back to the translated default.
  const resolvedLabel = label ?? t('auth.passwordInput.label', 'Password');
  const resolvedPlaceholder = placeholder ?? t('auth.passwordInput.placeholder', 'Enter your password');

  const strengthLabel = (() => {
    switch (validation.score) {
      case 0:
      case 1:
        return t('auth.passwordInput.strength.veryWeak', 'Very Weak');
      case 2:
        return t('auth.passwordInput.strength.weak', 'Weak');
      case 3:
        return t('auth.passwordInput.strength.fair', 'Fair');
      case 4:
        return t('auth.passwordInput.strength.good', 'Good');
      case 5:
        return t('auth.passwordInput.strength.strong', 'Strong');
      default:
        return t('auth.passwordInput.strength.unknown', 'Unknown');
    }
  })();

  return (
    <div className={cn('space-y-2', className)}>
      {resolvedLabel && (
        <Label htmlFor="password">
          {resolvedLabel}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder={resolvedPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={required}
          className={cn(
            'pr-10',
            error && 'border-destructive focus:border-destructive'
          )}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {showStrengthIndicator && value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('auth.passwordInput.strengthLabel', 'Password strength:')}</span>
            <span className={cn('text-sm font-medium', getPasswordStrengthColor(validation.score))}>
              {strengthLabel}
            </span>
          </div>
          
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 flex-1 rounded-full',
                  i < validation.score
                    ? validation.score <= 2
                      ? 'bg-destructive'
                      : validation.score <= 3
                      ? 'bg-amber-500'
                      : validation.score <= 4
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>

          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};