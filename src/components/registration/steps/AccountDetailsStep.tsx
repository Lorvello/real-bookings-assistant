
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { validatePassword } from '@/utils/passwordValidation';

interface AccountDetailsStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export const AccountDetailsStep: React.FC<AccountDetailsStepProps> = ({ data, updateData }) => {
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    
    // Apply appropriate sanitization based on field type
    if (field === 'email') {
      sanitizedValue = sanitizeUserInput(value, 'email');
    } else if (field === 'fullName') {
      sanitizedValue = sanitizeUserInput(value, 'text');
    }
    
    updateData({ [field]: sanitizedValue });

    // Real-time password validation
    if (field === 'password') {
      const validation = validatePassword(value);
      setPasswordError(validation.isValid ? '' : validation.errors[0] || '');
      
      // Check confirm password match
      if (data.confirmPassword && value !== data.confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
    }
    
    if (field === 'confirmPassword') {
      if (value !== data.password) {
        setConfirmPasswordError('Passwords do not match');
      } else {
        setConfirmPasswordError('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Persoonlijke Gegevens
        </h3>
        <p className="text-gray-600">
          Deze gegevens worden gebruikt voor je persoonlijke account
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="fullName">Volledige Naam *</Label>
          <Input
            id="fullName"
            type="text"
            value={data.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Voer je volledige naam in"
            className="h-12"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="email">E-mailadres *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="naam@voorbeeld.com"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <PasswordInput
            label="Wachtwoord *"
            placeholder="Minimaal 8 karakters met cijfers en speciale tekens"
            value={data.password}
            onChange={(value) => handleInputChange('password', value)}
            showStrengthIndicator={true}
            required={true}
            error={passwordError}
            className="space-y-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Bevestig Wachtwoord *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={data.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Herhaal je wachtwoord"
            className="h-12"
          />
          {confirmPasswordError && (
            <p className="text-sm text-destructive">{confirmPasswordError}</p>
          )}
        </div>
      </div>
    </div>
  );
};
