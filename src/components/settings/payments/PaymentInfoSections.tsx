import React from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Link as LinkIcon,
  CreditCard,
  CheckCircle,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FundFlowCard } from "../FundFlowCard";

/** A shared accordion row used by the three help sections inside one flush SettingsSection. */
function InfoRow({
  open,
  onOpenChange,
  id,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div id={id} className="scroll-mt-8">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6"
          >
            <div>
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const FLOW_NODES = [
  {
    labelKey: "settings.payments.fundFlow.nodes.customer.label",
    labelDefault: "Customer",
    captionKey: "settings.payments.fundFlow.nodes.customer.caption",
    captionDefault: "Payment initiated in local currency",
  },
  {
    labelKey: "settings.payments.fundFlow.nodes.connected.label",
    labelDefault: "Connected account",
    captionKey: "settings.payments.fundFlow.nodes.connected.caption",
    captionDefault: "Booking amount less the 1.9% application fee",
  },
  {
    labelKey: "settings.payments.fundFlow.nodes.bank.label",
    labelDefault: "Bank account",
    captionKey: "settings.payments.fundFlow.nodes.bank.caption",
    captionDefault: "Funds transferred (standard or instant payout)",
  },
];

const FLOW_BULLETS: { key: string; default: string }[] = [
  {
    key: "settings.payments.fundFlow.bullets.startCurrency",
    default: "The customer pays the booking amount through Stripe.",
  },
  {
    key: "settings.payments.fundFlow.bullets.applicationFee",
    default:
      "Booking Assistant deducts exactly 1.9% as the booking application fee.",
  },
  {
    key: "settings.payments.fundFlow.bullets.platformPaysStripe",
    default:
      "For this destination-charge flow, Stripe processing fees debit the Booking Assistant platform balance, not your booking payout.",
  },
  {
    key: "settings.payments.fundFlow.bullets.finalPayout",
    default:
      "Your connected Stripe balance receives the booking amount less 1.9%, before any separate Stripe account or payout adjustments.",
  },
];

export function FundFlowSection({
  open,
  onOpenChange,
  onLearnMoreFees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLearnMoreFees: () => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      title={t(
        "settings.payments.fundFlow.title",
        "Fund flow (how money moves)",
      )}
      subtitle={t(
        "settings.payments.fundFlow.subtitle",
        "Understand the payment journey for your bookings",
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <FlowNode {...FLOW_NODES[0]} />
          <FlowArrow>
            <FundFlowCard
              title={t(
                "settings.payments.fundFlow.processing.title",
                "Payment processing",
              )}
              items={[
                {
                  label: t(
                    "settings.payments.fundFlow.processing.platformFee.label",
                    "Booking application fee",
                  ),
                  description: t(
                    "settings.payments.fundFlow.processing.platformFee.description",
                    "Exactly 1.9% deducted by Booking Assistant",
                  ),
                },
                {
                  label: t(
                    "settings.payments.fundFlow.processing.stripeFeePayer.label",
                    "Stripe processing fee payer",
                  ),
                  description: t(
                    "settings.payments.fundFlow.processing.stripeFeePayer.description",
                    "Booking Assistant platform balance",
                  ),
                },
              ]}
              className="max-w-[220px]"
            />
          </FlowArrow>
          <FlowNode {...FLOW_NODES[1]} />
          <FlowArrow>
            <FundFlowCard
              title={t(
                "settings.payments.fundFlow.stripeProcessing.title",
                "Stripe payout",
              )}
              items={[
                {
                  label: t(
                    "settings.payments.fundFlow.stripeProcessing.fee.label",
                    "Separate Stripe costs",
                  ),
                  description: t(
                    "settings.payments.fundFlow.stripeProcessing.fee.description",
                    "Governed and shown by Stripe; not added to the 1.9% booking fee",
                  ),
                },
              ]}
              className="max-w-[220px]"
            />
          </FlowArrow>
          <FlowNode {...FLOW_NODES[2]} />
        </div>

        <ul className="space-y-1.5">
          {FLOW_BULLETS.map((b) => (
            <li
              key={b.key}
              className="flex items-start gap-2.5 text-xs text-muted-foreground"
            >
              <span
                className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60"
                aria-hidden="true"
              />
              <span>{t(b.key, b.default)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onLearnMoreFees}
          className="flex min-h-11 items-center gap-1.5 text-xs text-accent-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0"
        >
          <TrendingUp className="h-3 w-3" />
          {t(
            "settings.payments.fundFlow.learnMoreInFees",
            "Learn more in Fees",
          )}
        </button>
      </div>
    </InfoRow>
  );
}

function FlowNode({
  labelKey,
  labelDefault,
  captionKey,
  captionDefault,
}: {
  labelKey: string;
  labelDefault: string;
  captionKey: string;
  captionDefault: string;
}) {
  const { t } = useTranslation("settings");
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="rounded-full border border-primary/20 bg-primary/[0.10] px-4 py-2 text-sm font-medium text-accent-foreground">
        {t(labelKey, labelDefault)}
      </div>
      <p className="mt-2 max-w-[130px] text-center text-xs text-muted-foreground">
        {t(captionKey, captionDefault)}
      </p>
    </div>
  );
}

function FlowArrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-2">
      <div className="relative w-full border-t-2 border-dashed border-primary/30">
        <ArrowRight className="absolute -right-1 -top-2 h-4 w-4 text-primary/60" />
      </div>
      {children}
    </div>
  );
}

// `id` is the stable comparison key (R41 decouple); titleKey/bodyKey drive display only.
const STEPS: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  titleDefault: string;
  bodyKey: string | null;
  bodyDefault: string | null;
}[] = [
  {
    id: "books",
    icon: MessageSquare,
    titleKey: "settings.payments.howItWorks.steps.books.title",
    titleDefault: "Customer books via WhatsApp",
    bodyKey: "settings.payments.howItWorks.steps.books.body",
    bodyDefault:
      "Customer chats with your WhatsApp booking assistant, picks a service and a time slot.",
  },
  {
    id: "paymentLink",
    icon: LinkIcon,
    titleKey: "settings.payments.howItWorks.steps.paymentLink.title",
    titleDefault: "Payment link is generated",
    bodyKey: null,
    bodyDefault: null,
  },
  {
    id: "completes",
    icon: CreditCard,
    titleKey: "settings.payments.howItWorks.steps.completes.title",
    titleDefault: "Customer completes payment",
    bodyKey: "settings.payments.howItWorks.steps.completes.body",
    bodyDefault:
      "Customer picks an enabled payment method and pays securely through Stripe.",
  },
  {
    id: "confirmation",
    icon: CheckCircle,
    titleKey: "settings.payments.howItWorks.steps.confirmation.title",
    titleDefault: "Confirmation sent",
    bodyKey: "settings.payments.howItWorks.steps.confirmation.body",
    bodyDefault:
      "You and the customer both get confirmation and the booking is marked confirmed in your calendar.",
  },
  {
    id: "funds",
    icon: Wallet,
    titleKey: "settings.payments.howItWorks.steps.funds.title",
    titleDefault: "Funds arrive in your account",
    bodyKey: "settings.payments.howItWorks.steps.funds.body",
    bodyDefault:
      "After processing, funds are transferred to your bank, depending on the payout speed you selected.",
  },
];

export function HowItWorksSection({
  open,
  onOpenChange,
  paymentRequired,
  onScrollTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentRequired: boolean;
  onScrollTo: (id: string) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      title={t(
        "settings.payments.howItWorks.title",
        "How it works (payment flow)",
      )}
      subtitle={t(
        "settings.payments.howItWorks.subtitle",
        "Step-by-step: how customers pay for a booking",
      )}
    >
      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/[0.12] text-xs font-medium text-accent-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-primary" />
                <h5 className="text-sm font-medium text-foreground">
                  {t(step.titleKey, step.titleDefault)}
                </h5>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.id === "paymentLink" ? (
                  paymentRequired ? (
                    t(
                      "settings.payments.howItWorks.paymentLinkRequired",
                      "Customer gets a secure payment link and must pay to confirm the booking.",
                    )
                  ) : (
                    <>
                      {t(
                        "settings.payments.howItWorks.paymentLinkOptional",
                        "Customer can choose to pay now or on-site.",
                      )}{" "}
                      <button
                        type="button"
                        onClick={() =>
                          onScrollTo("payment-flexibility-section")
                        }
                        className="text-accent-foreground hover:underline"
                      >
                        {t(
                          "settings.payments.howItWorks.paymentLinkOptionalLink",
                          "Depending on the settings you choose above.",
                        )}
                      </button>
                    </>
                  )
                ) : step.bodyKey ? (
                  t(step.bodyKey, step.bodyDefault as string)
                ) : (
                  step.bodyDefault
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </InfoRow>
  );
}

export function FeesSection({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("settings");
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      id="fees-section"
      title={t("settings.payments.fees.title", "Fees")}
      subtitle={t(
        "settings.payments.fees.subtitle",
        "Exact booking deduction for the current charge model",
      )}
    >
      <div className="space-y-4 text-xs text-muted-foreground">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <dl className="space-y-2">
            <div className="flex justify-between gap-4">
              <dt>
                {t(
                  "settings.payments.fees.applicationFeeLabel",
                  "Booking Assistant application fee",
                )}
              </dt>
              <dd className="font-medium tabular-nums text-foreground">1.9%</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                {t(
                  "settings.payments.fees.stripeFeePayerLabel",
                  "Stripe processing fee payer",
                )}
              </dt>
              <dd className="text-right font-medium text-foreground">
                {t(
                  "settings.payments.fees.stripeFeePayerValue",
                  "Booking Assistant platform balance",
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h5 className="mb-2 font-medium text-foreground">
            {t("settings.payments.fees.exampleHeading", "€100 booking example")}
          </h5>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt>
                  {t(
                    "settings.payments.fees.example.bookingAmount",
                    "Booking amount",
                  )}
                </dt>
                <dd className="tabular-nums">€100.00</dd>
              </div>
              <div className="flex justify-between">
                <dt>
                  {t(
                    "settings.payments.fees.example.platformFee",
                    "Application fee (1.9%)",
                  )}
                </dt>
                <dd className="tabular-nums">-€1.90</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-white/[0.06] pt-1 font-medium text-foreground">
                <dt>
                  {t(
                    "settings.payments.fees.example.connectedBalance",
                    "Transferred to connected Stripe balance",
                  )}
                </dt>
                <dd className="tabular-nums">€98.10</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="text-subtle-foreground">
          {t(
            "settings.payments.fees.architectureNote",
            "This is the exact booking deduction in the current destination-charge flow. Any separate Stripe account or payout adjustments are controlled and shown by Stripe; Bookings Assistant does not estimate or add them here.",
          )}
        </p>
      </div>
    </InfoRow>
  );
}
