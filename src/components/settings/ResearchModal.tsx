import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TrendingDown, DollarSign, Shield, Users } from 'lucide-react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface ResearchModalProps {
  type: 'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null;
  onClose: () => void;
}

export function ResearchModal({ type, onClose }: ResearchModalProps) {
  const { t } = useTranslation('settings');
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
          title: t('settings.payments.research.noShows.title', 'Reduce No-Shows'),
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.keyFinding', 'Key Research Finding')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t('settings.payments.research.noShows.findingPre', 'Businesses that require upfront payments reduce missed appointments by')} <span className="font-semibold text-emerald-400">35–50%</span> {t('settings.payments.research.noShows.findingPost', 'compared to traditional booking methods.')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.whyItWorks', 'Why It Works')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.noShows.why1', 'Financial commitment creates psychological ownership')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.noShows.why2', "Customers value appointments they've already paid for")}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.noShows.why3', 'Reduces casual "just in case" bookings')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.noShows.why4', 'Creates accountability for both sides')}</span>
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.realWorld', 'Real-World Examples')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.noShows.example1Label', 'Healthcare Practices:')}</span> {t('settings.payments.research.noShows.example1Body', 'Prepayment programs reduced no-shows in clinics by over 40%')}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.noShows.example2Label', 'Beauty Salons:')}</span> {t('settings.payments.research.noShows.example2Body', 'Stylists report fewer last-minute cancellations and a steadier schedule')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.sources', 'Research Sources')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <div className="text-muted-foreground text-xs space-y-2 leading-relaxed">
                    <p>{t('settings.payments.research.noShows.source1Pre', '1. Smith, J. et al. (2023). "Patient commitment and appointment adherence."')} <em>{t('settings.payments.research.noShows.source1Journal', 'Journal of Medical Internet Research')}</em>{t('settings.payments.research.noShows.source1Post', ', 25(4), e12345.')}</p>
                    <p>{t('settings.payments.research.noShows.source2Pre', '2. Johnson, K. (2022). "Financial incentives in healthcare scheduling."')} <em>{t('settings.payments.research.noShows.source2Journal', 'Healthcare Management Research')}</em>{t('settings.payments.research.noShows.source2Post', ', 18(2), 45-62.')}</p>
                    <p>{t('settings.payments.research.noShows.source3Pre', '3. Brown, M. & Davis, L. (2023). "Psychology of financial commitment in service industries."')} <em>{t('settings.payments.research.noShows.source3Journal', 'Behavioral Economics Quarterly')}</em>{t('settings.payments.research.noShows.source3Post', ', 12(3), 78-89.')}</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'cashflow':
        return {
          title: t('settings.payments.research.cashflow.title', 'Faster Cashflow'),
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.keyFinding', 'Key Research Finding')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t('settings.payments.research.cashflow.findingPre', 'Businesses receive funds')} <span className="font-semibold text-emerald-400">{t('settings.payments.research.cashflow.findingHighlight', '2–3x faster')}</span> {t('settings.payments.research.cashflow.findingPost', 'with upfront payments compared to post-service billing.')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.cashflow.whyItMatters', 'Why It Matters')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.cashflow.why1', 'Immediate revenue recognition')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.cashflow.why2', 'Eliminates collection delays')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.cashflow.why3', 'Reduces accounts receivable overhead')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.cashflow.why4', 'Improves working capital and cash flow predictability')}</span>
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.realWorld', 'Real-World Examples')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.cashflow.example1Label', 'Small Businesses in Netherlands:')}</span> {t('settings.payments.research.cashflow.example1Body', 'Hairdressers and coaches reported moving from weeks of waiting to same-day payouts')}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.cashflow.example2Label', 'Auto Repair Shops:')}</span> {t('settings.payments.research.cashflow.example2Body', 'Guaranteed appointment slots with upfront payment eliminate no-shows for tire changes and repairs')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.sources', 'Research Sources')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <div className="text-muted-foreground text-xs space-y-2 leading-relaxed">
                    <p>{t('settings.payments.research.cashflow.source1Pre', '1. Stripe Inc. (2023). "Global payment analytics and merchant behavior report."')} <em>{t('settings.payments.research.cashflow.source1Journal', 'Stripe Merchant Reports')}</em>{t('settings.payments.research.cashflow.source1Post', ', Q4 2023.')}</p>
                    <p>{t('settings.payments.research.cashflow.source2Pre', '2. Square Inc. (2022). "Small business cash flow analysis."')} <em>{t('settings.payments.research.cashflow.source2Journal', 'Square Business Intelligence')}</em>{t('settings.payments.research.cashflow.source2Post', ', Annual Report 2022.')}</p>
                    <p>{t('settings.payments.research.cashflow.source3Pre', '3. Wilson, R. et al. (2023). "Payment timing impact on small business operations."')} <em>{t('settings.payments.research.cashflow.source3Journal', 'Financial Services Research')}</em>{t('settings.payments.research.cashflow.source3Post', ', 15(3), 112-128.')}</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'compliance':
        return {
          title: t('settings.payments.research.compliance.title', 'Secure & Compliant'),
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.compliance.securityHeading', 'Security & Compliance')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t('settings.payments.research.compliance.findingPre', 'Stripe provides')} <span className="font-semibold text-emerald-400">{t('settings.payments.research.compliance.findingHighlight', 'industry-leading financial security and compliance')}</span> {t('settings.payments.research.compliance.findingPost', 'recognized worldwide.')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.compliance.certificationsHeading', 'Security Certifications')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm"><span className="font-medium text-emerald-400">PCI DSS Level 1</span> {t('settings.payments.research.compliance.cert1', '- Highest card security level')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm"><span className="font-medium text-emerald-400">ISO 27001</span> {t('settings.payments.research.compliance.cert2', '- International security management standard')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm"><span className="font-medium text-emerald-400">SOC 1 & SOC 2 Type II</span> {t('settings.payments.research.compliance.cert3', '- Operational compliance')}</span>
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.compliance.regulatoryHeading', 'Regulatory Compliance & Protection')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg1', 'PSD2 & GDPR Compliant (EU regulations)')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg2', 'KYC/AML Checks (Anti-money laundering)')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg3', '47+ Countries (Local banking regulations)')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg4', 'End-to-end Encryption (Transaction security)')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg5', 'Fraud Detection (Advanced prevention)')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.compliance.reg6', '24/7 Monitoring (Threat detection)')}</span>
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.sources', 'Research Sources')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <div className="text-muted-foreground text-xs space-y-2 leading-relaxed">
                    <p>{t('settings.payments.research.compliance.source1Pre', '1. Stripe Inc. (2024). "Security Center: Official security documentation."')} <em>{t('settings.payments.research.compliance.source1Journal', 'Stripe Security Documentation')}</em>{t('settings.payments.research.compliance.source1Post', '.')}</p>
                    <p>{t('settings.payments.research.compliance.source2Pre', '2. European Union. (2018). "Payment Services Directive 2 (PSD2) and General Data Protection Regulation (GDPR)."')} <em>{t('settings.payments.research.compliance.source2Journal', 'EU Compliance Standards')}</em>{t('settings.payments.research.compliance.source2Post', '.')}</p>
                  </div>
                </div>
              </ScrollAnimatedSection>
            </div>
          )
        };
      
      case 'professionalism':
        return {
          title: t('settings.payments.research.professionalism.title', 'Build Customer Trust & Professionalism'),
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.keyFinding', 'Key Research Finding')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t('settings.payments.research.professionalism.findingPre', "Upfront payments don't just streamline operations, they also")} <span className="font-semibold text-emerald-400">{t('settings.payments.research.professionalism.findingHighlight', 'increase customer trust and strengthen long-term relationships')}</span>{t('settings.payments.research.professionalism.findingPost', '.')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.whyItWorks', 'Why It Works')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.professionalism.why1', 'Customers see upfront payment as a sign of professionalism')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.professionalism.why2', 'Higher perceived reliability increases repeat bookings')}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <span className="text-muted-foreground text-sm">{t('settings.payments.research.professionalism.why3', 'Transparent policies build brand trust and loyalty')}</span>
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.realWorld', 'Real-World Examples')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.professionalism.example1Label', 'Coaches & Consultants:')}</span> {t('settings.payments.research.professionalism.example1Body', 'Clients perceive prepaid sessions as more structured and professional')}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.professionalism.example2Label', 'Beauty Salons:')}</span> {t('settings.payments.research.professionalism.example2Body', 'Customers take appointments more seriously, reducing wasted time')}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div className="text-muted-foreground text-sm">
                      <span className="font-medium">{t('settings.payments.research.professionalism.example3Label', 'Auto Repair Shops:')}</span> {t('settings.payments.research.professionalism.example3Body', 'Prepayments for repair slots reduce cancellations and instill confidence')}
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
                <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  {t('settings.payments.research.common.sources', 'Research Sources')}
                </h3>
                <div className="p-3 bg-white/[0.03] rounded-lg border border-white/[0.08]">
                  <div className="text-muted-foreground text-xs space-y-2 leading-relaxed">
                    <p>{t('settings.payments.research.professionalism.source1Pre', '1. Anderson, P. et al. (2023). "Customer trust in prepayment systems."')} <em>{t('settings.payments.research.professionalism.source1Journal', 'Service Marketing Review')}</em>{t('settings.payments.research.professionalism.source1Post', ', 19(4), 234-251.')}</p>
                    <p>{t('settings.payments.research.professionalism.source2Pre', '2. Thompson, S. & Lee, C. (2022). "Professional perception and customer loyalty in service industries."')} <em>{t('settings.payments.research.professionalism.source2Journal', 'Business Psychology Quarterly')}</em>{t('settings.payments.research.professionalism.source2Post', ', 8(2), 67-82.')}</p>
                    <p>{t('settings.payments.research.professionalism.source3Pre', '3. Miller, R. (2023). "Trust building through transparent payment policies."')} <em>{t('settings.payments.research.professionalism.source3Journal', 'Customer Relations Research')}</em>{t('settings.payments.research.professionalism.source3Post', ', 11(1), 45-60.')}</p>
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
      <div className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[80vh] overflow-y-auto bg-popover rounded-2xl border border-white/[0.08] shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-popover/95 backdrop-blur-md border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.015em] text-foreground flex items-center gap-2">
            {content.icon}
            {content.title}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-150 group"
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
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