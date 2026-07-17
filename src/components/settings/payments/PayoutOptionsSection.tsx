import React from "react";
import { useTranslation } from "react-i18next";
import { Wallet, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SettingsSection } from "../SettingsSection";
import { BOOKING_APPLICATION_FEE_LABEL } from "@/config/paymentFees";
import type { PayoutType } from "./types";

interface PayoutOptionsSectionProps {
  selected: PayoutType;
  onSelect: (option: PayoutType) => void;
  hasUnsavedChanges: boolean;
  saving: boolean;
  onSave: () => void;
}

interface PayoutOption {
  value: PayoutType;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  platformFee: string;
}

const OPTIONS: PayoutOption[] = [
  {
    value: "standard",
    titleKey: "settings.payments.payout.standard.title",
    titleDefault: "Standard payout",
    subtitleKey: "settings.payments.payout.standard.subtitle",
    subtitleDefault: "3 business days to your account",
    platformFee: BOOKING_APPLICATION_FEE_LABEL,
  },
  {
    value: "instant",
    titleKey: "settings.payments.payout.instant.title",
    titleDefault: "Instant payout",
    subtitleKey: "settings.payments.payout.instant.subtitle",
    subtitleDefault: "Arrives within minutes",
    platformFee: BOOKING_APPLICATION_FEE_LABEL,
  },
];

function FeeBreakdown({ option }: { option: PayoutOption }) {
  const { t } = useTranslation("settings");
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group mt-3 flex min-h-11 items-center gap-1 text-xs text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0"
        >
          <span>
            {t(
              "settings.payments.payout.viewBreakdown",
              "View fee breakdown example",
            )}
          </span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 border-t border-white/[0.06] pt-3">
        <dl className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <dt>
              {t(
                "settings.payments.payout.platformFeeLabel",
                "Booking Assistant platform fee",
              )}
            </dt>
            <dd className="tabular-nums">{option.platformFee}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              {t(
                "settings.payments.payout.stripeFeePayerLabel",
                "Stripe processing fees",
              )}
            </dt>
            <dd className="text-right">
              {t(
                "settings.payments.payout.stripeFeePayerValue",
                "Paid by Booking Assistant",
              )}
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-white/[0.06] pt-1.5">
            <dt className="font-medium text-foreground">
              {t(
                "settings.payments.payout.bookingDeduction",
                "Deducted from each booking",
              )}
            </dt>
            <dd className="font-medium tabular-nums text-accent-foreground">
              {option.platformFee}
            </dd>
          </div>
          <p className="pt-1 text-subtle-foreground">
            {t(
              "settings.payments.payout.separateStripeCosts",
              "Any separate account or payout costs are governed and shown by Stripe; they are not added to this booking application fee.",
            )}
          </p>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Payout-speed picker (standard vs instant) with an inline fee-breakdown example.
 * Pure presentational — a real radiogroup (was raw <input type=radio> + peer hacks)
 * with an emerald-ringed selected card. Save is the shared premium Button (the old
 * raw <button> had no background class — it rendered invisible).
 */
export function PayoutOptionsSection({
  selected,
  onSelect,
  hasUnsavedChanges,
  saving,
  onSave,
}: PayoutOptionsSectionProps) {
  const { t } = useTranslation("settings");
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  return (
    <SettingsSection
      icon={Wallet}
      title={t("settings.payments.payout.title", "Payout options")}
      description={t(
        "settings.payments.payout.description",
        "Choose how quickly your payments land in your account.",
      )}
    >
      <div
        role="radiogroup"
        aria-label={t("settings.payments.payout.speedAria", "Payout speed")}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {OPTIONS.map((option, index) => {
          const isSelected = selected === option.value;
          // Presentational card shell. The radio semantics live on the inner
          // header element ONLY; FeeBreakdown (which carries its own button +
          // Select) is a SIBLING, not nested inside the radio, so axe
          // `nested-interactive` (WCAG 4.1.2) no longer fires. R17 F-027.
          return (
            <div
              key={option.value}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isSelected
                  ? "border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]",
              )}
            >
              <div
                ref={(el) => (cardRefs.current[index] = el)}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${t(option.titleKey, option.titleDefault)}, ${t(option.subtitleKey, option.subtitleDefault)}`}
                // Roving tabindex: only the selected card is a tab stop; arrows move within the group.
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onSelect(option.value);
                  } else if (
                    [
                      "ArrowRight",
                      "ArrowDown",
                      "ArrowLeft",
                      "ArrowUp",
                    ].includes(e.key)
                  ) {
                    e.preventDefault();
                    const dir =
                      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
                    const next =
                      (index + dir + OPTIONS.length) % OPTIONS.length;
                    onSelect(OPTIONS[next].value);
                    cardRefs.current[next]?.focus();
                  }
                }}
                className="flex cursor-pointer items-start justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {t(option.titleKey, option.titleDefault)}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {t(option.subtitleKey, option.subtitleDefault)}
                  </div>
                </div>
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20",
                  )}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </div>
              <FeeBreakdown option={option} />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {t("settings.payments.payout.selectedLabel", "Selected:")}{" "}
          <span className="font-medium text-foreground">
            {selected === "standard"
              ? t(
                  "settings.payments.payout.selectedStandard",
                  "Standard (3 business days)",
                )
              : t(
                  "settings.payments.payout.selectedInstant",
                  "Instant (within minutes)",
                )}
          </span>
        </p>
        <Button
          size="sm"
          onClick={onSave}
          disabled={!hasUnsavedChanges || saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving
            ? t("settings.payments.payout.saving", "Saving…")
            : t("settings.payments.payout.saveChanges", "Save changes")}
        </Button>
      </div>
    </SettingsSection>
  );
}
