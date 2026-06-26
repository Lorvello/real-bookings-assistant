import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation('privacy');
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'hsl(217, 35%, 12%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <button 
          onClick={handleBack}
          className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('privacy.goBack', 'Go back')}
        </button>

        {/* Main Card */}
        <Card className="bg-card border-border shadow-xl">
          <CardHeader className="text-center border-b border-border">
            <CardTitle className="text-3xl font-bold text-foreground">
              {t('privacy.title', 'Privacy Policy')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('privacy.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s1.h', '1. Introduction')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.s1.p', 'We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, store and protect your data when you use our calendar booking service.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s2.h', '2. What data we collect')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s2.p', 'We collect the following categories of personal data:')}
                </p>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t('privacy.s2.accountH', 'Account information:')}</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>{t('privacy.s2.acc1', 'Full name')}</li>
                      <li>{t('privacy.s2.acc2', 'Email address')}</li>
                      <li>{t('privacy.s2.acc3', 'Phone number')}</li>
                      <li>{t('privacy.s2.acc4', 'Business name')}</li>
                      <li>{t('privacy.s2.acc5', 'Password (encrypted stored)')}</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t('privacy.s2.bizH', 'Business data:')}</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>{t('privacy.s2.biz1', 'Business type and description')}</li>
                      <li>{t('privacy.s2.biz2', 'Service offerings and appointment types')}</li>
                      <li>{t('privacy.s2.biz3', 'Availability schedules')}</li>
                      <li>{t('privacy.s2.biz4', 'Booking settings')}</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t('privacy.s2.usageH', 'Usage data:')}</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>{t('privacy.s2.use1', 'Login activity and session data')}</li>
                      <li>{t('privacy.s2.use2', 'IP address and browser information')}</li>
                      <li>{t('privacy.s2.use3', 'Platform usage statistics')}</li>
                      <li>{t('privacy.s2.use4', 'Error logs and technical diagnostics')}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s3.h', '3. How we use your data')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s3.p', 'We use your personal data for the following purposes:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('privacy.s3.li1', 'Providing and maintaining our calendar booking service')}</li>
                  <li>{t('privacy.s3.li2', 'Processing bookings and appointments')}</li>
                  <li>{t('privacy.s3.li3', 'Sending confirmation and reminder emails')}</li>
                  <li>{t('privacy.s3.li4', 'Providing customer service and technical support')}</li>
                  <li>{t('privacy.s3.li5', 'Improving our service and user experience')}</li>
                  <li>{t('privacy.s3.li6', 'Complying with legal obligations')}</li>
                  <li>{t('privacy.s3.li7', 'Preventing fraud and abuse')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s4.h', '4. Data sharing and disclosure')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s4.p', 'We do not share your personal data with third parties, except in the following cases:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>{t('privacy.s4.l1', 'With your consent:')}</strong> {t('privacy.s4.v1', 'When you have explicitly consented to sharing')}</li>
                  <li><strong>{t('privacy.s4.l2', 'Service providers:')}</strong> {t('privacy.s4.v2', 'Trusted partners who help us deliver the service (hosting, email, payment)')}</li>
                  <li><strong>{t('privacy.s4.l3', 'Legal requirements:')}</strong> {t('privacy.s4.v3', 'When required by law or court orders')}</li>
                  <li><strong>{t('privacy.s4.l4', 'Business transfer:')}</strong> {t('privacy.s4.v4', 'In case of merger, acquisition or sale of business parts')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s5.h', '5. Data security')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s5.p', 'We implement appropriate technical and organizational measures to protect your data:')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t('privacy.s5.techH', 'Technical security:')}</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>{t('privacy.s5.tech1', 'SSL/TLS encryption')}</li>
                      <li>{t('privacy.s5.tech2', 'Secure databases')}</li>
                      <li>{t('privacy.s5.tech3', 'Regular security updates')}</li>
                      <li>{t('privacy.s5.tech4', 'Access controls')}</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">{t('privacy.s5.orgH', 'Organizational security:')}</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>{t('privacy.s5.org1', 'Limited access to data')}</li>
                      <li>{t('privacy.s5.org2', 'Regular security audits')}</li>
                      <li>{t('privacy.s5.org3', 'Employee training')}</li>
                      <li>{t('privacy.s5.org4', 'Incident response procedures')}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s6.h', '6. Your rights under GDPR')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s6.p', 'As an EU resident, you have the following rights regarding your personal data:')}
                </p>
                <div className="space-y-3">
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">{t('privacy.s6.r1h', 'Right of access')}</h3>
                    <p className="text-sm text-muted-foreground">{t('privacy.s6.r1p', 'You can request a copy of all personal data we have about you')}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">{t('privacy.s6.r2h', 'Right to rectification')}</h3>
                    <p className="text-sm text-muted-foreground">{t('privacy.s6.r2p', 'You can request correction of incorrect or incomplete data')}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">{t('privacy.s6.r3h', 'Right to erasure')}</h3>
                    <p className="text-sm text-muted-foreground">{t('privacy.s6.r3p', 'You can request deletion of your personal data')}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">{t('privacy.s6.r4h', 'Right to data portability')}</h3>
                    <p className="text-sm text-muted-foreground">{t('privacy.s6.r4p', 'You can request your data in a machine-readable format')}</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s7.h', '7. Data retention')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s7.p', 'We only retain your data as long as necessary for the purposes for which it was collected:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>{t('privacy.s7.l1', 'Active accounts:')}</strong> {t('privacy.s7.v1', 'As long as your account is active')}</li>
                  <li><strong>{t('privacy.s7.l2', 'Closed accounts:')}</strong> {t('privacy.s7.v2', 'Up to 30 days after closure (unless legally required otherwise)')}</li>
                  <li><strong>{t('privacy.s7.l3', 'Booking data:')}</strong> {t('privacy.s7.v3', 'Up to 7 years for administrative purposes')}</li>
                  <li><strong>{t('privacy.s7.l4', 'Log files:')}</strong> {t('privacy.s7.v4', 'Maximum 12 months')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s8.h', '8. Cookies and tracking')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s8.p', 'Our website uses cookies and similar technologies for:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('privacy.s8.li1', 'Remembering your preferences and login status')}</li>
                  <li>{t('privacy.s8.li2', 'Analyzing website usage for improvements')}</li>
                  <li>{t('privacy.s8.li3', 'Providing personalized user experience')}</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  {t('privacy.s8.closing', 'You can manage cookies through your browser settings, but this may affect functionality.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s9.h', '9. Changes to this privacy policy')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.s9.p', 'We may update this privacy policy from time to time. We will notify you of important changes via email or a prominent notice on our website. The date of the last change is always displayed at the top of this document.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  {t('privacy.s10.h', '10. Contact and questions')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('privacy.s10.p', 'For questions about this privacy policy or exercising your rights, you can contact us:')}
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      <strong>{t('privacy.s10.emailLabel', 'Email:')}</strong> <a href="mailto:support@bookingsassistant.com" className="text-primary hover:underline">support@bookingsassistant.com</a>
                    </p>
                    <p className="text-muted-foreground">
                      <strong>{t('privacy.s10.privacyLabel', 'Privacy inquiries:')}</strong> <a href="mailto:privacy@bookingsassistant.com" className="text-primary hover:underline">privacy@bookingsassistant.com</a>
                    </p>
                    <p className="text-muted-foreground"><strong>{t('privacy.s10.phoneLabel', 'Phone:')}</strong> +31 20 794 2048</p>
                    <p className="text-muted-foreground">
                      <strong>{t('privacy.s10.dpoLabel', 'Data Protection Officer:')}</strong> <a href="mailto:dpo@bookingsassistant.com" className="text-primary hover:underline">dpo@bookingsassistant.com</a>
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
                  {t('privacy.s10.closing', 'You also have the right to file a complaint with the Data Protection Authority if you believe we are not handling your data correctly.')}
                </p>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button onClick={handleBack} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t('privacy.goBack', 'Go back')}
                </Button>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80 underline">
                    {t('privacy.footer.terms', 'Terms of Service')}
                  </Link>
                  <Link to="/faq" className="text-primary hover:text-primary/80 underline">
                    {t('privacy.footer.faq', 'FAQ')}
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;