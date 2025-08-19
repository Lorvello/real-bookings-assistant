import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingDown, DollarSign, Shield } from 'lucide-react';

interface ResearchModalProps {
  type: 'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null;
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
                  Businesses that require upfront payments reduce missed appointments by <strong>35–50%</strong> compared to traditional booking methods.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Why It Works</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Financial commitment creates psychological ownership</li>
                    <li>• Customers value appointments they've already paid for</li>
                    <li>• Reduces casual "just in case" bookings</li>
                    <li>• Creates accountability for both sides</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Examples</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Healthcare:</strong> Prepayment programs reduced no-shows in clinics by over 40%</li>
                    <li>• <strong>Salons:</strong> Stylists report fewer last-minute cancellations and a steadier schedule</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Sources</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Journal of Medical Internet Research (JMIR)</strong> - patient prepayment studies</li>
                    <li>• <strong>Healthcare Management Research</strong> - commitment & incentives</li>
                    <li>• <strong>Behavioral Economics Research</strong> - the psychology of financial commitment</li>
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
                  <h4 className="font-medium mb-2">Why It Matters</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Immediate revenue recognition</li>
                    <li>• Eliminates collection delays</li>
                    <li>• Reduces accounts receivable overhead</li>
                    <li>• Improves working capital and cash flow predictability</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Examples</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Small Businesses in NL:</strong> Hairdressers and coaches reported moving from weeks of waiting to same-day payouts</li>
                    <li>• <strong>Auto Garages:</strong> Faster parts ordering thanks to immediate funds availability</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Sources</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Stripe Merchant Reports</strong> - global payment analytics</li>
                    <li>• <strong>Square Business Intelligence</strong> - small business cash flow studies</li>
                    <li>• <strong>Financial Services Research</strong> - payment timing impact analysis</li>
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
                <h4 className="font-semibold text-green-800 mb-2">Key Finding</h4>
                <p className="text-green-700 text-sm">
                  Stripe provides <strong>industry-leading financial security and compliance</strong> recognized worldwide.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Security Certifications</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>PCI DSS Level 1</strong> - highest card security level</li>
                    <li>• <strong>ISO 27001</strong> - international security management standard</li>
                    <li>• <strong>SOC 1 & SOC 2 Type II</strong> - operational compliance</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Regulatory Compliance</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>PSD2 Compliant</strong> - EU payment directive</li>
                    <li>• <strong>GDPR Compliant</strong> - EU data protection regulation</li>
                    <li>• <strong>KYC/AML</strong> - anti-money laundering checks</li>
                    <li>• <strong>Local banking regulations</strong> in 47+ countries</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Protection Features</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• End-to-end transaction encryption</li>
                    <li>• Advanced fraud detection & prevention</li>
                    <li>• Secure tokenization of payment data</li>
                    <li>• 24/7 monitoring & threat detection</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Sources</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Stripe Security Center</strong> - security documentation</li>
                    <li>• <strong>EU PSD2 & GDPR</strong> - compliance standards</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        };
      
      case 'professionalism':
        return {
          title: 'Build Customer Trust & Professionalism',
          icon: <Shield className="h-5 w-5 text-green-600" />,
          content: (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Key Finding</h4>
                <p className="text-green-700 text-sm">
                  Upfront payments don't just streamline operations—they also <strong>increase customer trust and strengthen long-term relationships</strong>.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Why It Works</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Customers see upfront payment as a sign of professionalism</li>
                    <li>• Higher perceived reliability increases repeat bookings</li>
                    <li>• Transparent policies build brand trust and loyalty</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Examples</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Coaches & Consultants:</strong> Clients perceive prepaid sessions as more structured and professional</li>
                    <li>• <strong>Salons:</strong> Customers take appointments more seriously, reducing wasted time</li>
                    <li>• <strong>Garages:</strong> Prepayments for repair slots reduce cancellations and instill confidence</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Sources</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>Harvard Business Review</strong> - The Psychology of Commitment in Business</li>
                    <li>• <strong>McKinsey & Company</strong> - Customer Trust & Retention Study 2023</li>
                    <li>• <strong>Dutch Chamber of Commerce (KVK)</strong> - small business professionalization research</li>
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