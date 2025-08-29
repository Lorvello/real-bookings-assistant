// Mock data types that mirror real Stripe API shapes
export interface MockTaxSettings {
  success: boolean;
  taxSettings: {
    originAddress: {
      line1: string;
      city: string;
      postal_code: string;
      country: string;
    };
    defaultTaxBehavior: 'inclusive' | 'exclusive';
    pricesIncludeTax: boolean;
    presetProductTaxCode: string;
    automaticTax: {
      checkout: { enabled: boolean; status: 'active' | 'inactive' };
      invoices: { enabled: boolean; status: 'active' | 'inactive' };
    };
  };
  taxRegistrations: Array<{
    country: string;
    type: string;
    status: 'active' | 'inactive' | 'pending';
    active_from: number;
  }>;
  thresholdMonitoring: { enabled: boolean };
}

export interface MockTaxCode {
  id: string;
  name: string;
  description: string;
}

export interface MockTaxData {
  success: boolean;
  lastUpdated: string;
  quarterlyData: {
    quarterEnd: string;
  };
  currentMonth: {
    totalRevenue: number;
    vatCollected: number;
    vatRate: number;
    transactions: number;
    exemptTransactions: number;
  };
  quarterly: {
    q1: { revenue: number; vat: number };
    q2: { revenue: number; vat: number };
    q3: { revenue: number; vat: number };
    q4: { revenue: number; vat: number };
  };
  compliance: {
    lastReportGenerated: string;
    nextDueDate: string;
    status: string;
    autoSubmission: boolean;
  };
}

// Mock data payloads
export const mockTaxSettings: MockTaxSettings = {
  success: true,
  taxSettings: {
    originAddress: {
      line1: 'Hoofdstraat 123',
      city: 'Amsterdam',
      postal_code: '1012 AB',
      country: 'NL'
    },
    defaultTaxBehavior: 'exclusive',
    pricesIncludeTax: false,
    presetProductTaxCode: 'txcd_10000000',
    automaticTax: {
      checkout: { enabled: true, status: 'active' },
      invoices: { enabled: true, status: 'active' }
    }
  },
  taxRegistrations: [
    { 
      country: 'NL', 
      type: 'vat', 
      status: 'active', 
      active_from: Date.now() / 1000 
    },
    { 
      country: 'DE', 
      type: 'vat', 
      status: 'pending', 
      active_from: (Date.now() + 86400000) / 1000 
    }
  ],
  thresholdMonitoring: { enabled: true }
};

export const mockTaxCodes: MockTaxCode[] = [
  { 
    id: 'txcd_10000000', 
    name: 'General - Tangible Goods', 
    description: 'Physical products' 
  },
  { 
    id: 'txcd_10501000', 
    name: 'Digital - Software', 
    description: 'Software and apps' 
  },
  { 
    id: 'txcd_30000000', 
    name: 'Services - Professional', 
    description: 'Professional services' 
  },
  { 
    id: 'txcd_99999999', 
    name: 'Exempt', 
    description: 'Tax exempt goods/services' 
  }
];

export const mockTaxData: MockTaxData = {
  success: true,
  lastUpdated: new Date().toISOString(),
  quarterlyData: {
    quarterEnd: '2024-03-31'
  },
  currentMonth: {
    totalRevenue: 4850.00,
    vatCollected: 1019.50,
    vatRate: 21,
    transactions: 47,
    exemptTransactions: 2
  },
  quarterly: {
    q1: { revenue: 13240.00, vat: 2780.40 },
    q2: { revenue: 15680.00, vat: 3292.80 },
    q3: { revenue: 14520.00, vat: 3049.20 },
    q4: { revenue: 16180.00, vat: 3397.80 }
  },
  compliance: {
    lastReportGenerated: '2024-01-15',
    nextDueDate: '2024-04-01',
    status: 'compliant',
    autoSubmission: true
  }
};