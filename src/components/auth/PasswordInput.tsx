
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  placeholder,
  autoComplete = "current-password",
  required = false
}) => {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const ph = placeholder ?? t('auth.passwordInput.placeholder', 'Enter your password');

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-foreground">
        {t('auth.passwordInput.label', 'Password')}
      </Label>
      <div className="relative">
        <Input 
          type={showPassword ? "text" : "password"}
          id={id}
          required={required}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={ph}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword
            ? t('auth.passwordInput.hidePassword', 'Hide password')
            : t('auth.passwordInput.showPassword', 'Show password')}
          aria-pressed={showPassword}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
