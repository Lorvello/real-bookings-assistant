
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

interface AccountDetailsStepProps {
  data: any;
  updateData: (updates: any) => void;
}

export const AccountDetailsStep: React.FC<AccountDetailsStepProps> = ({ data, updateData }) => {
  const [showPassword, setShowPassword] = useState(false);

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
            onChange={(e) => updateData({ fullName: e.target.value })}
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
            onChange={(e) => updateData({ email: e.target.value })}
            placeholder="naam@voorbeeld.com"
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Wachtwoord *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => updateData({ password: e.target.value })}
              placeholder="Minimaal 6 karakters"
              className="h-12 pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Bevestig Wachtwoord *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={data.confirmPassword}
            onChange={(e) => updateData({ confirmPassword: e.target.value })}
            placeholder="Herhaal je wachtwoord"
            className="h-12"
          />
        </div>
      </div>
    </div>
  );
};
