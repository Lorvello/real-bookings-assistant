import React from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Download, Receipt } from 'lucide-react';

export interface BillingInvoice {
  id: string;
  /** Pre-formatted date, e.g. "Jun 1, 2026". */
  date: string;
  /** Pre-formatted amount, e.g. "€30.00". */
  amount: string;
  description: string;
  status: string;
  /** Pre-mapped status label, e.g. "Paid" / "Pending" / "Draft". */
  statusLabel: string;
  invoiceUrl?: string | null;
}

interface BillingHistorySectionProps {
  invoices: BillingInvoice[];
  loading?: boolean;
  showAll: boolean;
  /** True when there are more than the 3 shown rows (drives the "View all" action). */
  hasMore: boolean;
  onToggleShowAll: () => void;
  /** Empty-state copy owned by the caller (state-dependent). */
  emptyMessage: string;
  /** Show the "View available plans" CTA in the empty state. */
  showPlansCta?: boolean;
  onViewPlans?: () => void;
}

function statusBadgeClass(status: string) {
  if (status === 'paid') return 'border-success/20 bg-success/10 text-success-foreground';
  if (status === 'open' || status === 'draft') return 'border-warning/20 bg-warning/10 text-warning-foreground';
  return 'border-destructive/20 bg-destructive/10 text-destructive-foreground';
}

function InvoiceDownload({ invoice }: { invoice: BillingInvoice }) {
  if (!invoice.invoiceUrl) {
    return <span className="text-xs text-subtle-foreground">Not available</span>;
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.open(invoice.invoiceUrl!, '_blank')}
      aria-label={`Download invoice from ${invoice.date}`}
    >
      <Download className="h-3.5 w-3.5" />
    </Button>
  );
}

/**
 * Billing history — a flush table on md+, stacked cards on mobile (the R15
 * responsive-table pattern, so the table never clips inside the overflow-hidden
 * Card). Pure props; the orchestrator formats dates/amounts and maps statuses.
 */
export function BillingHistorySection({
  invoices,
  loading,
  showAll,
  hasMore,
  onToggleShowAll,
  emptyMessage,
  showPlansCta,
  onViewPlans,
}: BillingHistorySectionProps) {
  const visible = showAll ? invoices : invoices.slice(0, 3);

  return (
    <SettingsSection
      icon={CreditCard}
      title="Billing history"
      description="Your past invoices and payment receipts."
      action={
        hasMore ? (
          <Button onClick={onToggleShowAll} variant="outline" size="sm">
            {showAll ? 'Show less' : 'View all'}
          </Button>
        ) : undefined
      }
      flush={invoices.length > 0 && !loading}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading billing history…</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center px-2 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.10] text-accent-foreground">
            <Receipt className="h-5 w-5" />
          </div>
          <h4 className="mb-1.5 text-base font-semibold text-foreground">No billing history yet</h4>
          <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
          {showPlansCta && (
            <Button variant="outline" size="sm" onClick={onViewPlans}>
              View available plans
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards (the flush table would clip inside overflow-hidden) */}
          <div className="divide-y divide-white/[0.05] md:hidden">
            {visible.map((invoice) => (
              <div key={invoice.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{invoice.description}</p>
                  <p className="text-xs text-muted-foreground">{invoice.date}</p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-sm font-medium tabular-nums text-foreground">{invoice.amount}</span>
                    <Badge className={statusBadgeClass(invoice.status)}>{invoice.statusLabel}</Badge>
                  </div>
                </div>
                <InvoiceDownload invoice={invoice} />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.05] hover:bg-transparent">
                  <TableHead className="text-subtle-foreground">Date</TableHead>
                  <TableHead className="text-subtle-foreground">Amount</TableHead>
                  <TableHead className="text-subtle-foreground">Description</TableHead>
                  <TableHead className="text-subtle-foreground">Status</TableHead>
                  <TableHead className="text-right text-subtle-foreground">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((invoice) => (
                  <TableRow key={invoice.id} className="border-white/[0.05] transition-colors hover:bg-white/[0.02]">
                    <TableCell className="text-foreground">{invoice.date}</TableCell>
                    <TableCell className="font-medium tabular-nums text-foreground">{invoice.amount}</TableCell>
                    <TableCell className="text-muted-foreground">{invoice.description}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(invoice.status)}>{invoice.statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceDownload invoice={invoice} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
