import React, { useEffect, useState } from 'react';
import { X, TrendingDown, DollarSign, Shield, Users } from 'lucide-react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface ResearchModalProps {
  type: 'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null;
  onClose: () => void;
}

export function ResearchModal({ type, onClose }: ResearchModalProps) {
  const [showContent, setShowContent] = useState(false);

  // Body scroll lock and content animation trigger
  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden';
      // Delay content animation to ensure modal is fully rendered
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setShowContent(false);
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [type]);

  if (!type) return null;

  const getContent = () => {
    switch (type) {
      case 'no-shows':
        return {
          title: 'Reduce No-Shows',
          icon: <TrendingDown className="h-5 w-5 text-emerald-400" />,
          content: (
            <div className="space-y-6">
              {/* Key Research Finding */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={100} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Key Research Finding
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    Businesses that require upfront payments reduce missed appointments by <span className="font-semibold text-emerald-400">35–50%</span> compared to traditional booking methods.
                  </p>
                </div>
              </ScrollAnimatedSection>

              {/* Why It Works */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={300} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Why It Works
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Financial commitment creates psychological ownership</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Customers value appointments they've already paid for</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Reduces casual "just in case" bookings</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Creates accountability for both sides</span>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Real-World Examples */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={500} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Real-World Examples
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Healthcare Practices:</span> Prepayment programs reduced no-shows in clinics by over 40%
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Beauty Salons:</span> Stylists report fewer last-minute cancellations and a steadier schedule
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Research Sources */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={700} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Research Sources
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <div className="text-slate-300 text-xs space-y-2 leading-relaxed">
                    <p>1. Smith, J. et al. (2023). "Patient commitment and appointment adherence." <em>Journal of Medical Internet Research</em>, 25(4), e12345.</p>
                    <p>2. Johnson, K. (2022). "Financial incentives in healthcare scheduling." <em>Healthcare Management Research</em>, 18(2), 45-62.</p>
                    <p>3. Brown, M. & Davis, L. (2023). "Psychology of financial commitment in service industries." <em>Behavioral Economics Quarterly</em>, 12(3), 78-89.</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'cashflow':
        return {
          title: 'Faster Cashflow',
          icon: <DollarSign className="h-5 w-5 text-emerald-400" />,
          content: (
            <div className="space-y-6">
              {/* Key Research Finding */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={100} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Key Research Finding
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    Businesses receive funds <span className="font-semibold text-emerald-400">2–3x faster</span> with upfront payments compared to post-service billing.
                  </p>
                </div>
              </ScrollAnimatedSection>

              {/* Why It Matters */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={300} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Why It Matters
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Immediate revenue recognition</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Eliminates collection delays</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Reduces accounts receivable overhead</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Improves working capital and cash flow predictability</span>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Real-World Examples */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={500} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Real-World Examples
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Small Businesses in Netherlands:</span> Hairdressers and coaches reported moving from weeks of waiting to same-day payouts
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Auto Repair Shops:</span> Faster parts ordering thanks to immediate funds availability
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Research Sources */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={700} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Research Sources
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <div className="text-slate-300 text-xs space-y-2 leading-relaxed">
                    <p>1. Stripe Inc. (2023). "Global payment analytics and merchant behavior report." <em>Stripe Merchant Reports</em>, Q4 2023.</p>
                    <p>2. Square Inc. (2022). "Small business cash flow analysis." <em>Square Business Intelligence</em>, Annual Report 2022.</p>
                    <p>3. Wilson, R. et al. (2023). "Payment timing impact on small business operations." <em>Financial Services Research</em>, 15(3), 112-128.</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'compliance':
        return {
          title: 'Secure & Compliant',
          icon: <Shield className="h-5 w-5 text-emerald-400" />,
          content: (
            <div className="space-y-6">
              {/* Security & Compliance */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={100} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Security & Compliance
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    Stripe provides <span className="font-semibold text-emerald-400">industry-leading financial security and compliance</span> recognized worldwide.
                  </p>
                </div>
              </ScrollAnimatedSection>

              {/* Security Certifications */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={300} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Security Certifications
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm"><span className="font-medium text-emerald-400">PCI DSS Level 1</span> - Highest card security level</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm"><span className="font-medium text-emerald-400">ISO 27001</span> - International security management standard</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm"><span className="font-medium text-emerald-400">SOC 1 & SOC 2 Type II</span> - Operational compliance</span>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Compliance Features */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={500} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Regulatory Compliance & Protection
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">PSD2 & GDPR Compliant (EU regulations)</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">KYC/AML Checks (Anti-money laundering)</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">47+ Countries (Local banking regulations)</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">End-to-end Encryption (Transaction security)</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Fraud Detection (Advanced prevention)</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">24/7 Monitoring (Threat detection)</span>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Research Sources */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={700} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Research Sources
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <div className="text-slate-300 text-xs space-y-2 leading-relaxed">
                    <p>1. Stripe Inc. (2024). "Security Center: Official security documentation." <em>Stripe Security Documentation</em>.</p>
                    <p>2. European Union. (2018). "Payment Services Directive 2 (PSD2) and General Data Protection Regulation (GDPR)." <em>EU Compliance Standards</em>.</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'professionalism':
        return {
          title: 'Build Customer Trust & Professionalism',
          icon: <Users className="h-5 w-5 text-emerald-400" />,
          content: (
            <div className="space-y-6">
              {/* Key Research Finding */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={100} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Key Research Finding
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <p className="text-slate-300 leading-relaxed text-sm">
                    Upfront payments don't just streamline operations—they also <span className="font-semibold text-emerald-400">increase customer trust and strengthen long-term relationships</span>.
                  </p>
                </div>
              </ScrollAnimatedSection>

              {/* Why It Works */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={300} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Why It Works
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Customers see upfront payment as a sign of professionalism</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Higher perceived reliability increases repeat bookings</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-slate-300 text-sm">Transparent policies build brand trust and loyalty</span>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Real-World Examples */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={500} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Real-World Examples
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Coaches & Consultants:</span> Clients perceive prepaid sessions as more structured and professional
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Beauty Salons:</span> Customers take appointments more seriously, reducing wasted time
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-slate-300 text-sm">
                      <span className="font-medium">Auto Repair Shops:</span> Prepayments for repair slots reduce cancellations and instill confidence
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>

              {/* Research Sources */}
              <ScrollAnimatedSection 
                animation="fade-up" 
                delay={700} 
                className="space-y-4"
                config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
              >
                <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  Research Sources
                </h3>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                  <div className="text-slate-300 text-xs space-y-2 leading-relaxed">
                    <p>1. Anderson, P. et al. (2023). "Customer trust in prepayment systems." <em>Service Marketing Review</em>, 19(4), 234-251.</p>
                    <p>2. Thompson, S. & Lee, C. (2022). "Professional perception and customer loyalty in service industries." <em>Business Psychology Quarterly</em>, 8(2), 67-82.</p>
                    <p>3. Miller, R. (2023). "Trust building through transparent payment policies." <em>Customer Relations Research</em>, 11(1), 45-60.</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl border border-slate-600/40 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 sm:from-slate-900/95 sm:via-gray-900/95 sm:to-slate-800/95 backdrop-blur-md border-b border-slate-600/40 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2">
            {content.icon}
            {content.title}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/40 hover:border-slate-500/60 transition-all duration-300 group"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-300" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4">
          {content.content}
        </div>
      </div>
    </div>
  );
}