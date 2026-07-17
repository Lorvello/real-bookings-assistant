import React from "react";
import { useTranslation } from "react-i18next";
import { Info, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CurrencyConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POINTS: { key: string; default: string; positive?: boolean }[] = [
  {
    key: "settings.payments.currencyDialog.points.extraFee",
    default:
      "Stripe determines whether currency conversion is required and which current terms apply.",
  },
  {
    key: "settings.payments.currencyDialog.points.example",
    default:
      "The payment currency and connected Stripe account currency determine whether conversion occurs.",
  },
  {
    key: "settings.payments.currencyDialog.points.onTop",
    default:
      "Booking Assistant does not calculate this provider cost as an extra booking application fee.",
  },
  {
    key: "settings.payments.currencyDialog.points.ownCurrency",
    default:
      "The customer sees the payment currency before confirming the payment.",
  },
  {
    key: "settings.payments.currencyDialog.points.sameCurrency",
    default:
      "Paying and settling in the same currency generally avoids conversion.",
    positive: true,
  },
];

/**
 * Currency-conversion explainer — now on the shared Dialog primitive (premium overlay,
 * focus trap, Esc-to-close, labelled title) instead of the old hand-rolled fixed div.
 */
export function CurrencyConversionDialog({
  open,
  onOpenChange,
}: CurrencyConversionDialogProps) {
  const { t } = useTranslation("settings");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t(
              "settings.payments.currencyDialog.title",
              "Currency conversion through Stripe",
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {POINTS.map((point) => (
            <div key={point.key} className="flex items-start gap-3">
              {point.positive ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
              ) : (
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                  aria-hidden="true"
                />
              )}
              <span className="text-sm text-foreground">
                {t(point.key, point.default)}
              </span>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {t(
                "settings.payments.currencyDialog.tip",
                "Review the current terms and any costs in your Stripe account.",
              )}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
