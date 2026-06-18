// Shared presentational types for the Pay & Book settings surface (BLOK D R18).
// Kept here so the pure section components and the PaymentSettingsTab orchestrator
// agree on shape without a circular import through the orchestrator.

export type PayoutType = 'standard' | 'instant';

export interface PaymentMethodFee {
  id: string;
  name: string;
  fee: string;
  feeType: 'fixed' | 'percentage';
}
