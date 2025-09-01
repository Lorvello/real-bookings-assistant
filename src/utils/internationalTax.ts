// International Tax Configuration System
// Comprehensive tax rates and codes for major markets

export interface TaxRate {
  code: string;
  name: string;
  rate: number;
  type: 'standard' | 'reduced' | 'zero' | 'exempt';
  description: string;
  applicableServices: string[];
}

export interface CountryTaxConfig {
  country: string;
  countryCode: string;
  countryName: string;
  currency: string;
  taxSystemName: string;
  flag: string;
  rates: TaxRate[];
  defaultTaxCode: string;
  businessB2BExempt: boolean;
}

// EU Harmonized Tax Codes
export const EU_TAX_CODES = {
  GENERAL_SERVICES: 'txcd_10000000',
  PERSONAL_CARE: 'txcd_20030000', 
  BEAUTY_WELLNESS: 'txcd_20030000',
  PROFESSIONAL_SERVICES: 'txcd_30060000',
  MEDICAL_SERVICES: 'txcd_30070000',
  EDUCATION: 'txcd_30020000',
  DIGITAL_SERVICES: 'txcd_10505000',
  CONSULTING: 'txcd_30060000',
  FITNESS: 'txcd_20030000'
};

// US Tax Product Codes (simplified)
export const US_TAX_CODES = {
  GENERAL_SERVICES: 'txcd_99999999',
  PERSONAL_CARE: 'txcd_20030000',
  PROFESSIONAL_SERVICES: 'txcd_30060000',
  DIGITAL_SERVICES: 'txcd_10505000'
};

// International Tax Configuration
export const INTERNATIONAL_TAX_CONFIG: Record<string, CountryTaxConfig> = {
  NL: {
    country: 'NL',
    countryCode: 'NL', 
    countryName: 'Netherlands',
    currency: 'EUR',
    taxSystemName: 'VAT',
    flag: '🇳🇱',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard', 
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness', 'spa']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (9% VAT)',
        rate: 9,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      },
      {
        code: EU_TAX_CODES.EDUCATION,
        name: 'Exempt (0% VAT)',
        rate: 0,
        type: 'exempt',
        description: 'Educational services',
        applicableServices: ['education', 'training']
      }
    ]
  },

  DE: {
    country: 'DE',
    countryCode: 'DE',
    countryName: 'Germany', 
    currency: 'EUR',
    taxSystemName: 'VAT',
    flag: '🇩🇪',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (19% VAT)',
        rate: 19,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (19% VAT)',
        rate: 19,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (7% VAT)',
        rate: 7,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy', 
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  FR: {
    country: 'FR',
    countryCode: 'FR',
    countryName: 'France',
    currency: 'EUR', 
    taxSystemName: 'VAT',
    flag: '🇫🇷',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (20% VAT)',
        rate: 20,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (20% VAT)',
        rate: 20,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (10% VAT)',
        rate: 10,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  GB: {
    country: 'GB',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    taxSystemName: 'VAT', 
    flag: '🇬🇧',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (20% VAT)',
        rate: 20,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (20% VAT)',
        rate: 20,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (5% VAT)',
        rate: 5,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  BE: {
    country: 'BE',
    countryCode: 'BE',
    countryName: 'Belgium',
    currency: 'EUR',
    taxSystemName: 'VAT',
    flag: '🇧🇪',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (6% VAT)',
        rate: 6,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  ES: {
    country: 'ES',
    countryCode: 'ES',
    countryName: 'Spain',
    currency: 'EUR',
    taxSystemName: 'VAT',
    flag: '🇪🇸',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (21% VAT)',
        rate: 21,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (10% VAT)',
        rate: 10,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  IT: {
    country: 'IT',
    countryCode: 'IT',
    countryName: 'Italy',
    currency: 'EUR',
    taxSystemName: 'VAT',
    flag: '🇮🇹',
    businessB2BExempt: true,
    defaultTaxCode: EU_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: EU_TAX_CODES.GENERAL_SERVICES,
        name: 'Standard Rate (22% VAT)',
        rate: 22,
        type: 'standard',
        description: 'Most services and goods',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: EU_TAX_CODES.PERSONAL_CARE,
        name: 'Standard Rate (22% VAT)',
        rate: 22,
        type: 'standard',
        description: 'Beauty, wellness, personal care',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: EU_TAX_CODES.MEDICAL_SERVICES,
        name: 'Reduced Rate (10% VAT)',
        rate: 10,
        type: 'reduced',
        description: 'Medical treatments, physiotherapy',
        applicableServices: ['medical', 'healthcare', 'therapy']
      }
    ]
  },

  US: {
    country: 'US',
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    taxSystemName: 'Sales Tax',
    flag: '🇺🇸',
    businessB2BExempt: false,
    defaultTaxCode: US_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: US_TAX_CODES.GENERAL_SERVICES,
        name: 'Variable Rate (0-10% Sales Tax)',
        rate: 0, // Variable by state
        type: 'standard',
        description: 'Rate varies by state and service type',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: US_TAX_CODES.PERSONAL_CARE,
        name: 'Variable Rate (0-10% Sales Tax)',
        rate: 0,
        type: 'standard',
        description: 'Rate varies by state (some states exempt services)',
        applicableServices: ['beauty', 'wellness', 'fitness']
      },
      {
        code: US_TAX_CODES.DIGITAL_SERVICES,
        name: 'Variable Rate (0-10% Sales Tax)',
        rate: 0,
        type: 'standard',
        description: 'Digital services taxation varies by state',
        applicableServices: ['digital', 'online']
      }
    ]
  },

  CA: {
    country: 'CA',
    countryCode: 'CA',
    countryName: 'Canada',
    currency: 'CAD',
    taxSystemName: 'GST/HST',
    flag: '🇨🇦',
    businessB2BExempt: true,
    defaultTaxCode: US_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: US_TAX_CODES.GENERAL_SERVICES,
        name: 'GST/HST (5-15%)',
        rate: 5, // Base GST, provinces add more
        type: 'standard',
        description: '5% GST + provincial rates (varies by province)',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: US_TAX_CODES.PERSONAL_CARE,
        name: 'GST/HST (5-15%)',
        rate: 5,
        type: 'standard',
        description: 'Beauty and wellness services',
        applicableServices: ['beauty', 'wellness', 'fitness']
      }
    ]
  },

  AU: {
    country: 'AU',
    countryCode: 'AU',
    countryName: 'Australia',
    currency: 'AUD',
    taxSystemName: 'GST',
    flag: '🇦🇺',
    businessB2BExempt: true,
    defaultTaxCode: US_TAX_CODES.GENERAL_SERVICES,
    rates: [
      {
        code: US_TAX_CODES.GENERAL_SERVICES,
        name: 'GST (10%)',
        rate: 10,
        type: 'standard',
        description: 'Goods and Services Tax',
        applicableServices: ['general', 'consulting', 'professional']
      },
      {
        code: US_TAX_CODES.PERSONAL_CARE,
        name: 'GST (10%)',
        rate: 10,
        type: 'standard',
        description: 'Beauty and wellness services',
        applicableServices: ['beauty', 'wellness', 'fitness']
      }
    ]
  }
};

// Service Category Classification
export const SERVICE_CATEGORIES = {
  beauty: ['beauty', 'hair', 'nails', 'spa', 'salon', 'massage'],
  wellness: ['wellness', 'therapy', 'relaxation', 'mindfulness'],
  fitness: ['fitness', 'gym', 'personal training', 'yoga', 'pilates'],
  medical: ['medical', 'healthcare', 'physiotherapy', 'dental', 'clinic'],
  professional: ['consulting', 'legal', 'accounting', 'business', 'advice'],
  education: ['education', 'training', 'course', 'lesson', 'tutoring'],
  digital: ['digital', 'online', 'virtual', 'software'],
  general: ['appointment', 'service', 'meeting', 'session']
};

// Utility Functions
export function detectBusinessCountry(stripeAccount: any): string {
  if (stripeAccount?.country) {
    return stripeAccount.country.toUpperCase();
  }
  return 'NL'; // Default fallback
}

export function getTaxConfigForCountry(countryCode: string): CountryTaxConfig | null {
  return INTERNATIONAL_TAX_CONFIG[countryCode] || null;
}

export function getTaxRatesForCountry(countryCode: string): TaxRate[] {
  const config = getTaxConfigForCountry(countryCode);
  return config?.rates || [];
}

export function classifyService(serviceName: string, serviceDescription?: string): string {
  const searchText = `${serviceName} ${serviceDescription || ''}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(SERVICE_CATEGORIES)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }
  return 'general';
}

export function getSuggestedTaxRateForService(
  countryCode: string, 
  serviceName: string, 
  serviceDescription?: string
): TaxRate | null {
  const config = getTaxConfigForCountry(countryCode);
  if (!config) return null;

  const serviceCategory = classifyService(serviceName, serviceDescription);
  
  // Find the most appropriate tax rate for this service category
  const applicableRates = config.rates.filter(rate => 
    rate.applicableServices.includes(serviceCategory)
  );
  
  if (applicableRates.length > 0) {
    return applicableRates[0]; // Return the first applicable rate
  }
  
  // Fallback to standard rate
  return config.rates.find(rate => rate.type === 'standard') || config.rates[0];
}

export function formatTaxRate(rate: TaxRate, countryConfig: CountryTaxConfig): string {
  if (rate.rate === 0) {
    return `${rate.name}`;
  }
  return `${rate.name}`;
}

export function getCountriesWithTaxSupport(): CountryTaxConfig[] {
  return Object.values(INTERNATIONAL_TAX_CONFIG);
}

export function isEUCountry(countryCode: string): boolean {
  const euCountries = ['NL', 'DE', 'FR', 'GB', 'BE', 'ES', 'IT', 'AT', 'DK', 'SE', 'FI', 'PT', 'IE', 'LU', 'CY', 'MT', 'SI', 'SK', 'CZ', 'HU', 'PL', 'EE', 'LV', 'LT', 'BG', 'RO', 'HR'];
  return euCountries.includes(countryCode);
}