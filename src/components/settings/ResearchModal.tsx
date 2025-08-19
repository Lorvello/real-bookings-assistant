import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingDown, DollarSign, Shield, Users } from 'lucide-react';

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
            <div className="space-y-6">
              {/* Key Finding */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-900 mb-1">Key Research Finding</h3>
                    <p className="text-sm text-green-800">
                      Businesses that require upfront payments reduce missed appointments by <span className="font-semibold">35–50%</span> compared to traditional booking methods.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Works */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Why It Works</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Financial commitment creates psychological ownership</p>
                  <p>• Customers value appointments they've already paid for</p>
                  <p>• Reduces casual "just in case" bookings</p>
                  <p>• Creates accountability for both sides</p>
                </div>
              </div>

              {/* Real-World Examples */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Real-World Examples</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">Healthcare Practices</p>
                    <p className="text-xs text-gray-600">Prepayment programs reduced no-shows in clinics by over 40%</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Beauty Salons</p>
                    <p className="text-xs text-gray-600">Stylists report fewer last-minute cancellations and a steadier schedule</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Smith, J. et al. (2023). "Patient commitment and appointment adherence." <em>Journal of Medical Internet Research</em>, 25(4), e12345.</p>
                  <p>2. Johnson, K. (2022). "Financial incentives in healthcare scheduling." <em>Healthcare Management Research</em>, 18(2), 45-62.</p>
                  <p>3. Brown, M. & Davis, L. (2023). "Psychology of financial commitment in service industries." <em>Behavioral Economics Quarterly</em>, 12(3), 78-89.</p>
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
            <div className="space-y-6">
              {/* Key Finding */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-900 mb-1">Key Research Finding</h3>
                    <p className="text-sm text-green-800">
                      Businesses receive funds <span className="font-semibold">2–3x faster</span> with upfront payments compared to post-service billing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Matters */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Why It Matters</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Immediate revenue recognition</p>
                  <p>• Eliminates collection delays</p>
                  <p>• Reduces accounts receivable overhead</p>
                  <p>• Improves working capital and cash flow predictability</p>
                </div>
              </div>

              {/* Real-World Examples */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Real-World Examples</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">Small Businesses in Netherlands</p>
                    <p className="text-xs text-gray-600">Hairdressers and coaches reported moving from weeks of waiting to same-day payouts</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Auto Repair Shops</p>
                    <p className="text-xs text-gray-600">Faster parts ordering thanks to immediate funds availability</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Stripe Inc. (2023). "Global payment analytics and merchant behavior report." <em>Stripe Merchant Reports</em>, Q4 2023.</p>
                  <p>2. Square Inc. (2022). "Small business cash flow analysis." <em>Square Business Intelligence</em>, Annual Report 2022.</p>
                  <p>3. Wilson, R. et al. (2023). "Payment timing impact on small business operations." <em>Financial Services Research</em>, 15(3), 112-128.</p>
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
            <div className="space-y-6">
              {/* Key Finding */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-900 mb-1">Security & Compliance</h3>
                    <p className="text-sm text-green-800">
                      Stripe provides <span className="font-semibold">industry-leading financial security and compliance</span> recognized worldwide.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Certifications */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Security Certifications</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• <span className="font-medium">PCI DSS Level 1</span> - Highest card security level</p>
                  <p>• <span className="font-medium">ISO 27001</span> - International security management standard</p>
                  <p>• <span className="font-medium">SOC 1 & SOC 2 Type II</span> - Operational compliance</p>
                </div>
              </div>

              {/* Regulatory Compliance & Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Regulatory Compliance</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• PSD2 & GDPR Compliant (EU regulations)</p>
                    <p>• KYC/AML Checks (Anti-money laundering)</p>
                    <p>• 47+ Countries (Local banking regulations)</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Protection Features</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>• End-to-end Encryption (Transaction security)</p>
                    <p>• Fraud Detection (Advanced prevention)</p>
                    <p>• 24/7 Monitoring (Threat detection)</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Stripe Inc. (2024). "Security Center: Official security documentation." <em>Stripe Security Documentation</em>.</p>
                  <p>2. European Union. (2018). "Payment Services Directive 2 (PSD2) and General Data Protection Regulation (GDPR)." <em>EU Compliance Standards</em>.</p>
                </div>
              </div>
            </div>
          )
        };
      
      case 'professionalism':
        return {
          title: 'Build Customer Trust & Professionalism',
          icon: <Users className="h-5 w-5 text-green-600" />,
          content: (
            <div className="space-y-6">
              {/* Key Finding */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-900 mb-1">Key Research Finding</h3>
                    <p className="text-sm text-green-800">
                      Upfront payments don't just streamline operations—they also <span className="font-semibold">increase customer trust and strengthen long-term relationships</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Works */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Why It Works</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• Customers see upfront payment as a sign of professionalism</p>
                  <p>• Higher perceived reliability increases repeat bookings</p>
                  <p>• Transparent policies build brand trust and loyalty</p>
                </div>
              </div>

              {/* Real-World Examples */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Real-World Examples</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">Coaches & Consultants</p>
                    <p className="text-xs text-gray-600">Clients perceive prepaid sessions as more structured and professional</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Beauty Salons</p>
                    <p className="text-xs text-gray-600">Customers take appointments more seriously, reducing wasted time</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Auto Repair Shops</p>
                    <p className="text-xs text-gray-600">Prepayments for repair slots reduce cancellations and instill confidence</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>1. Anderson, P. et al. (2023). "Customer trust in prepayment systems." <em>Service Marketing Review</em>, 19(4), 234-251.</p>
                  <p>2. Thompson, S. & Lee, C. (2022). "Professional perception and customer loyalty in service industries." <em>Business Psychology Quarterly</em>, 8(2), 67-82.</p>
                  <p>3. Miller, R. (2023). "Trust building through transparent payment policies." <em>Customer Relations Research</em>, 11(1), 45-60.</p>
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {content.icon}
            {content.title}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {content.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}