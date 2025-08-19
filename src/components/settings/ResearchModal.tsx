import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingDown, DollarSign, Shield } from 'lucide-react';

interface ResearchModalProps {
  type: 'no-shows' | 'cashflow' | 'compliance' | null;
  onClose: () => void;
}

export function ResearchModal({ type, onClose }: ResearchModalProps) {
  if (!type) return null;

  const getContent = () => {
    switch (type) {
      case 'no-shows':
        return {
          title: 'Reduce No-Shows',
          icon: <TrendingDown className="h-5 w-5 text-green-600" />,
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Key Finding</h4>
                <p className="text-green-700 text-sm">
                  Upfront payments reduce missed appointments by <strong>35–50%</strong> compared to traditional booking methods.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Research Sources</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>National Library of Medicine</strong> - Journal of Medical Internet Research (JMIR)</li>
                    <li>• <strong>Healthcare Management Research</strong> - Patient commitment and financial incentives</li>
                    <li>• <strong>Behavioral Economics Studies</strong> - Financial commitment psychology</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Why It Works</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Financial commitment creates psychological ownership</li>
                    <li>• Customers value appointments they've paid for</li>
                    <li>• Reduces casual booking behavior</li>
                    <li>• Creates accountability for both parties</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        };
      
      case 'cashflow':
        return {
          title: 'Faster Cashflow',
          icon: <DollarSign className="h-5 w-5 text-green-600" />,
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Key Finding</h4>
                <p className="text-green-700 text-sm">
                  Businesses receive funds <strong>2–3x faster</strong> with upfront payments compared to post-service billing.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Research Sources</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Stripe Merchant Reports</strong> - Payment processing analytics</li>
                    <li>• <strong>Square Business Intelligence</strong> - Small business cash flow studies</li>
                    <li>• <strong>Financial Services Research</strong> - Payment timing impact analysis</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Business Benefits</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Immediate revenue recognition</li>
                    <li>• Eliminates payment collection delays</li>
                    <li>• Reduces accounts receivable overhead</li>
                    <li>• Improves working capital management</li>
                    <li>• Enables better financial planning</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        };
      
      case 'compliance':
        return {
          title: 'Secure & Compliant',
          icon: <Shield className="h-5 w-5 text-green-600" />,
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Industry-Leading Security</h4>
                <p className="text-green-700 text-sm">
                  Stripe maintains the highest levels of financial compliance and security certifications globally.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Security Certifications</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>PCI DSS Level 1</strong> - Highest level of payment card security</li>
                    <li>• <strong>ISO 27001</strong> - International security management standard</li>
                    <li>• <strong>SOC 1 & SOC 2 Type II</strong> - Operational security compliance</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Regulatory Compliance</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>PSD2 Compliant</strong> - European payment services directive</li>
                    <li>• <strong>EU KYC/AML</strong> - Know Your Customer & Anti-Money Laundering</li>
                    <li>• <strong>GDPR Compliant</strong> - European data protection regulation</li>
                    <li>• <strong>Local Banking Regulations</strong> - Compliant in 47+ countries</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Protection Features</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• End-to-end encryption for all transactions</li>
                    <li>• Advanced fraud detection and prevention</li>
                    <li>• Secure tokenization of payment data</li>
                    <li>• 24/7 monitoring and threat detection</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        };
      
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {content.icon}
            <span>{content.title}</span>
          </DialogTitle>
        </DialogHeader>
        {content.content}
      </DialogContent>
    </Dialog>
  );
}