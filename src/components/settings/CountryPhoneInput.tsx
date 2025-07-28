import React, { useState, useMemo, useEffect } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Country data with calling codes
const COUNTRIES = [
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', callingCode: '+31' },
  { code: 'US', name: 'United States', flag: '🇺🇸', callingCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', callingCode: '+44' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', callingCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', callingCode: '+33' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', callingCode: '+34' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', callingCode: '+39' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', callingCode: '+351' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', callingCode: '+32' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', callingCode: '+43' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', callingCode: '+41' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', callingCode: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', callingCode: '+47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', callingCode: '+45' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', callingCode: '+358' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', callingCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', callingCode: '+420' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', callingCode: '+36' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', callingCode: '+40' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', callingCode: '+359' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', callingCode: '+385' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', callingCode: '+386' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', callingCode: '+421' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', callingCode: '+370' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', callingCode: '+371' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', callingCode: '+372' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', callingCode: '+353' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', callingCode: '+352' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', callingCode: '+356' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', callingCode: '+357' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', callingCode: '+30' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', callingCode: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', callingCode: '+61' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', callingCode: '+64' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', callingCode: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', callingCode: '+82' },
  { code: 'CN', name: 'China', flag: '🇨🇳', callingCode: '+86' },
  { code: 'IN', name: 'India', flag: '🇮🇳', callingCode: '+91' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', callingCode: '+55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', callingCode: '+52' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', callingCode: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', callingCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', callingCode: '+57' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', callingCode: '+51' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', callingCode: '+58' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', callingCode: '+27' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', callingCode: '+20' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', callingCode: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', callingCode: '+254' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', callingCode: '+212' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', callingCode: '+216' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', callingCode: '+213' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', callingCode: '+7' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', callingCode: '+380' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', callingCode: '+375' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', callingCode: '+90' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', callingCode: '+972' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', callingCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', callingCode: '+966' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', callingCode: '+974' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', callingCode: '+965' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', callingCode: '+973' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', callingCode: '+968' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', callingCode: '+962' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', callingCode: '+961' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', callingCode: '+964' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', callingCode: '+98' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', callingCode: '+93' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', callingCode: '+92' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', callingCode: '+880' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', callingCode: '+94' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', callingCode: '+960' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', callingCode: '+66' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', callingCode: '+84' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', callingCode: '+60' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', callingCode: '+65' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', callingCode: '+62' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', callingCode: '+63' },
].sort((a, b) => a.name.localeCompare(b.name));

interface CountryPhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryPhoneInput({ value = '', onChange, className, disabled }: CountryPhoneInputProps) {
  // Local state for immediate UI updates
  const [localSelectedCountry, setLocalSelectedCountry] = useState<string>('NL');
  const [localNumber, setLocalNumber] = useState<string>('');

  // Initialize and sync with external value
  useEffect(() => {
    if (!value) {
      setLocalSelectedCountry('NL');
      setLocalNumber('');
      return;
    }
    
    // Find matching country by calling code
    const country = COUNTRIES.find(c => value.startsWith(c.callingCode));
    if (country) {
      setLocalSelectedCountry(country.code);
      setLocalNumber(value.substring(country.callingCode.length));
    } else {
      // Default to Netherlands if no match
      setLocalSelectedCountry('NL');
      setLocalNumber(value.startsWith('+') ? value.substring(3) : value);
    }
  }, [value]);

  const countryOptions = COUNTRIES.map(country => ({
    value: country.code,
    label: `${country.flag} ${country.name} ${country.callingCode}`,
    searchText: `${country.name} ${country.callingCode} ${country.code}`
  }));

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      // Update local state immediately
      setLocalSelectedCountry(countryCode);
      const newValue = country.callingCode + localNumber;
      onChange(newValue);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d]/g, ''); // Only allow digits
    const country = COUNTRIES.find(c => c.code === localSelectedCountry);
    if (country) {
      // Update local state immediately for instant feedback
      setLocalNumber(newNumber);
      const newValue = country.callingCode + newNumber;
      onChange(newValue);
    }
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === localSelectedCountry);

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="w-48">
        <SearchableSelect
          value={localSelectedCountry}
          onValueChange={handleCountryChange}
          options={countryOptions}
          placeholder="Select country"
          searchPlaceholder="Search countries..."
          disabled={disabled}
        />
      </div>
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          {selectedCountryData?.callingCode}
        </div>
        <Input
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          placeholder="123456789"
          className="pl-16 bg-gray-800 border-gray-700 text-white"
          disabled={disabled}
        />
      </div>
    </div>
  );
}