import { z } from "npm:zod@3.23.8";
import { isAllowedCheckoutUrl } from "../_shared/checkoutUrl.ts";

export { isAllowedCheckoutUrl };

const optionalStripePriceId = z.string().trim().regex(/^price_[A-Za-z0-9]+$/)
  .optional();

export const subscriptionCheckoutSchema = z.object({
  priceId: optionalStripePriceId,
  tier_name: z.enum(["starter", "professional"]),
  is_annual: z.boolean().default(false),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  mode: z.enum(["test", "live"]).optional(),
  price: z.number().finite().nonnegative().optional(),
  automaticTax: z.boolean().optional(),
  serviceIds: z.array(z.string().uuid()).max(0).optional(),
  calendarId: z.never().optional(),
  bookingId: z.never().optional(),
  paymentMethod: z.never().optional(),
}).strict();

export type SubscriptionCheckoutRequest = z.infer<
  typeof subscriptionCheckoutSchema
>;

export interface SubscriptionTierPriceRow {
  tier_name: string;
  is_active: boolean | null;
  stripe_test_monthly_price_id: string | null;
  stripe_test_yearly_price_id: string | null;
  stripe_live_monthly_price_id: string | null;
  stripe_live_yearly_price_id: string | null;
}

export function resolveSubscriptionPriceId(
  tier: SubscriptionTierPriceRow,
  mode: "test" | "live",
  annual: boolean,
): string {
  if (tier.is_active !== true) {
    throw new Error("SUBSCRIPTION_TIER_INACTIVE");
  }

  const field = `stripe_${mode}_${
    annual ? "yearly" : "monthly"
  }_price_id` as keyof SubscriptionTierPriceRow;
  const priceId = tier[field];
  if (typeof priceId !== "string" || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
    throw new Error("SUBSCRIPTION_PRICE_NOT_CONFIGURED");
  }
  return priceId;
}
