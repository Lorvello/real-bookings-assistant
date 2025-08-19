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
          icon: <TrendingDown className="h-6 w-6" />,
          content: (
            <div className="space-y-8">
              {/* Key Finding - Hero Section */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900 mb-2">Key Research Finding</h3>
                    <p className="text-emerald-800 font-medium text-base leading-relaxed">
                      Businesses that require upfront payments reduce missed appointments by <span className="text-2xl font-bold text-emerald-900">35–50%</span> compared to traditional booking methods.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Works */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Why It Works</h4>
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Financial commitment creates psychological ownership</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Customers value appointments they've already paid for</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Reduces casual "just in case" bookings</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Creates accountability for both sides</p>
                  </div>
                </div>
              </div>

              {/* Real-World Examples */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Real-World Examples</h4>
                <div className="space-y-4">
                  <div className="border-l-4 border-emerald-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Healthcare Practices</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Prepayment programs reduced no-shows in clinics by over 40%</p>
                  </div>
                  <div className="border-l-4 border-emerald-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Beauty Salons</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Stylists report fewer last-minute cancellations and a steadier schedule</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Journal of Medical Internet Research (JMIR) – patient prepayment studies</p>
                  <p>Healthcare Management Research – commitment & incentives</p>
                  <p>Behavioral Economics Research – psychology of financial commitment</p>
                </div>
              </div>
            </div>
          )
        };
      
      case 'cashflow':
        return {
          title: 'Faster Cashflow',
          icon: <DollarSign className="h-6 w-6" />,
          content: (
            <div className="space-y-8">
              {/* Key Finding - Hero Section */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/60 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Key Research Finding</h3>
                    <p className="text-blue-800 font-medium text-base leading-relaxed">
                      Businesses receive funds <span className="text-2xl font-bold text-blue-900">2–3x faster</span> with upfront payments compared to post-service billing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Matters */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Why It Matters</h4>
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Immediate revenue recognition</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Eliminates collection delays</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Reduces accounts receivable overhead</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Improves working capital and cash flow predictability</p>
                  </div>
                </div>
              </div>

              {/* Real-World Examples */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Real-World Examples</h4>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Small Businesses in Netherlands</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Hairdressers and coaches reported moving from weeks of waiting to same-day payouts</p>
                  </div>
                  <div className="border-l-4 border-blue-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Auto Repair Shops</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Faster parts ordering thanks to immediate funds availability</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Stripe Merchant Reports – global payment analytics</p>
                  <p>Square Business Intelligence – small business cash flow studies</p>
                  <p>Financial Services Research – payment timing impact analysis</p>
                </div>
              </div>
            </div>
          )
        };
      
      case 'compliance':
        return {
          title: 'Secure & Compliant',
          icon: <Shield className="h-6 w-6" />,
          content: (
            <div className="space-y-8">
              {/* Key Finding - Hero Section */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/60 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">Security & Compliance</h3>
                    <p className="text-purple-800 font-medium text-base leading-relaxed">
                      Stripe provides <span className="font-bold text-purple-900">industry-leading financial security and compliance</span> recognized worldwide.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Certifications */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Security Certifications</h4>
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">PCI DSS Level 1</p>
                      <p className="text-gray-600 text-sm">Highest card security level</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">ISO 27001</p>
                      <p className="text-gray-600 text-sm">International security management standard</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">SOC 1 & SOC 2 Type II</p>
                      <p className="text-gray-600 text-sm">Operational compliance</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regulatory Compliance & Features */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Regulatory Compliance</h4>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">PSD2 & GDPR Compliant</p>
                      <p className="text-gray-600 text-xs">EU regulations</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">KYC/AML Checks</p>
                      <p className="text-gray-600 text-xs">Anti-money laundering</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">47+ Countries</p>
                      <p className="text-gray-600 text-xs">Local banking regulations</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Protection Features</h4>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">End-to-end Encryption</p>
                      <p className="text-gray-600 text-xs">Transaction security</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">Fraud Detection</p>
                      <p className="text-gray-600 text-xs">Advanced prevention</p>
                    </div>
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <p className="font-medium text-gray-900 text-sm">24/7 Monitoring</p>
                      <p className="text-gray-600 text-xs">Threat detection</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Stripe Security Center – official security documentation</p>
                  <p>EU PSD2 & GDPR – compliance standards</p>
                </div>
              </div>
            </div>
          )
        };
      
      case 'professionalism':
        return {
          title: 'Build Customer Trust & Professionalism',
          icon: <Users className="h-6 w-6" />,
          content: (
            <div className="space-y-8">
              {/* Key Finding - Hero Section */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Key Research Finding</h3>
                    <p className="text-amber-800 font-medium text-base leading-relaxed">
                      Upfront payments don't just streamline operations—they also <span className="font-bold text-amber-900">increase customer trust and strengthen long-term relationships</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why It Works */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Why It Works</h4>
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Customers see upfront payment as a sign of professionalism</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Higher perceived reliability increases repeat bookings</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                    <p className="text-gray-700 leading-relaxed">Transparent policies build brand trust and loyalty</p>
                  </div>
                </div>
              </div>

              {/* Real-World Examples */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Real-World Examples</h4>
                <div className="space-y-4">
                  <div className="border-l-4 border-amber-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Coaches & Consultants</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Clients perceive prepaid sessions as more structured and professional</p>
                  </div>
                  <div className="border-l-4 border-amber-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Beauty Salons</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Customers take appointments more seriously, reducing wasted time</p>
                  </div>
                  <div className="border-l-4 border-amber-400 pl-4 py-2">
                    <p className="font-medium text-gray-900">Auto Repair Shops</p>
                    <p className="text-gray-600 text-sm leading-relaxed">Prepayments for repair slots reduce cancellations and instill confidence</p>
                  </div>
                </div>
              </div>

              {/* Sources */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Research Sources</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Harvard Business Review – The Psychology of Commitment in Business</p>
                  <p>McKinsey & Company – Customer Trust & Retention Study 2023</p>
                  <p>Dutch Chamber of Commerce (KVK) – small business professionalization research</p>
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <div className="p-2 bg-gray-100 rounded-lg">
              {content.icon}
            </div>
            <span className="text-gray-900">{content.title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="pb-4">
          {content.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}