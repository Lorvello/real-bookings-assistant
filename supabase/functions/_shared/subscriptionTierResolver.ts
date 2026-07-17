export type StripeMode = "test" | "live";

export interface SubscriptionTierMapping {
  tier_name: string;
  is_active?: boolean | null;
  stripe_test_monthly_price_id: string | null;
  stripe_test_yearly_price_id: string | null;
  stripe_live_monthly_price_id: string | null;
  stripe_live_yearly_price_id: string | null;
}

const PAID_TIERS = new Set(["starter", "professional", "enterprise"]);

export function resolveConfiguredSubscriptionTier(
  tiers: SubscriptionTierMapping[],
  priceId: string | null | undefined,
  mode: StripeMode,
  metadataTier?: string | null,
): string {
  if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
    throw new Error("SUBSCRIPTION_PRICE_ID_INVALID");
  }

  const monthlyField = `stripe_${mode}_monthly_price_id` as const;
  const yearlyField = `stripe_${mode}_yearly_price_id` as const;
  const matches = tiers.filter((tier) =>
    tier.is_active !== false &&
    (tier[monthlyField] === priceId || tier[yearlyField] === priceId)
  );
  if (matches.length === 0) {
    throw new Error("SUBSCRIPTION_PRICE_UNKNOWN");
  }
  if (matches.length !== 1) {
    throw new Error("SUBSCRIPTION_PRICE_MAPPING_AMBIGUOUS");
  }

  const tier = matches[0].tier_name.trim().toLowerCase();
  if (!PAID_TIERS.has(tier)) {
    throw new Error("SUBSCRIPTION_TIER_INVALID");
  }

  const normalizedMetadata = metadataTier?.trim().toLowerCase();
  if (
    normalizedMetadata && normalizedMetadata !== "unknown" &&
    normalizedMetadata !== tier
  ) {
    throw new Error("SUBSCRIPTION_TIER_METADATA_MISMATCH");
  }
  return tier;
}
