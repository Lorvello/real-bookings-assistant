
import React from 'react';

export const BillingTab: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-6">Billing & Subscription</h2>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Billing Management</h3>
          <p className="text-muted-foreground mb-4">
            This feature is still in development. Soon you'll be able to manage your subscription and invoices here.
          </p>
          <div className="text-sm text-muted-foreground">
            Contact us if you have questions about your subscription.
          </div>
        </div>
      </div>
    </div>
  );
};
