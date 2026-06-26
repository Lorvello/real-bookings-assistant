import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  const { t, i18n } = useTranslation('terms');
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
          {t('terms.goBack', 'Go back')}
        </button>

        {/* Main Card */}
        <Card className="bg-card border-border shadow-xl">
          <CardHeader className="text-center border-b border-border">
            <CardTitle className="text-3xl font-bold text-foreground">
              {t('terms.title', 'Terms of Service')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t('terms.lastUpdated', 'Last updated:')} {new Date().toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s1.h', '1. Acceptance of terms')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s1.p', 'By using our calendar booking service, you agree to these terms of service. If you do not agree to these terms, you may not use our service.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s2.h', '2. Service description')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('terms.s2.p', 'Our service provides a multi-tenant calendar booking platform where businesses can:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('terms.s2.li1', 'Manage their own calendar settings')}</li>
                  <li>{t('terms.s2.li2', 'Configure appointment types')}</li>
                  <li>{t('terms.s2.li3', 'Set availability schedules')}</li>
                  <li>{t('terms.s2.li4', 'Set up automated booking processes')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s3.h', '3. Account and registration')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('terms.s3.p', 'To use our service, you must:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('terms.s3.li1', 'Provide accurate and complete information during registration')}</li>
                  <li>{t('terms.s3.li2', 'Keep your account information up to date')}</li>
                  <li>{t('terms.s3.li3', 'Be responsible for all activities under your account')}</li>
                  <li>{t('terms.s3.li4', 'Keep your password secure and not share it')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s4.h', '4. Permitted use')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('terms.s4.p1', 'You may use our service for:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('terms.s4.a1', 'Legitimate business activities')}</li>
                  <li>{t('terms.s4.a2', 'Managing appointments and bookings')}</li>
                  <li>{t('terms.s4.a3', 'Communication with customers about bookings')}</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4 mb-3">
                  {t('terms.s4.p2', 'It is not permitted to:')}
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>{t('terms.s4.b1', 'Use the service for illegal activities')}</li>
                  <li>{t('terms.s4.b2', 'Send spam or unwanted messages')}</li>
                  <li>{t('terms.s4.b3', 'Attempt to hack or abuse the service')}</li>
                  <li>{t('terms.s4.b4', "Access other users' accounts without permission")}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s5.h', '5. Data protection')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s5.p', 'We take data protection seriously. Your personal data is processed in accordance with our Privacy Policy and applicable privacy legislation, including GDPR.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s6.h', '6. Service availability')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s6.p', 'We strive to keep our service available 24/7, but cannot guarantee 100% uptime. Maintenance and updates may cause temporary service interruptions.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s7.h', '7. Payments and billing')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s7.p', 'Payment terms are specified in your subscription. All prices are exclusive of VAT unless otherwise stated. Payments are due according to the agreed payment terms.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s8.h', '8. Termination')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s8.p', 'You may cancel your account at any time. We reserve the right to suspend or terminate accounts for violation of these terms or abuse of the service.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s9.h', '9. Liability')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s9.p', 'Our liability is limited to the amount you have paid for the service in the 12 months preceding the claim. We are not liable for indirect or consequential damages.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s10.h', '10. Changes')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s10.p', 'We reserve the right to modify these terms. Changes will take effect 30 days after notification via email or through our website.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s11.h', '11. Applicable law')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {t('terms.s11.p', 'These terms are governed by Dutch law. Disputes will be submitted to the competent court in the Netherlands.')}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {t('terms.s12.h', '12. Contact')}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {t('terms.s12.p', 'For questions about these terms, you can contact us:')}
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-muted-foreground">
                    {t('terms.s12.emailLabel', 'Email:')} <a href="mailto:support@bookingsassistant.com" className="text-primary hover:underline">support@bookingsassistant.com</a>
                  </p>
                  <p className="text-muted-foreground">{t('terms.s12.phoneLabel', 'Phone:')} +31 20 794 2048</p>
                </div>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button onClick={handleBack} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t('terms.goBack', 'Go back')}
                </Button>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline">
                    {t('terms.footer.privacy', 'Privacy Policy')}
                  </Link>
                  <Link to="/faq" className="text-primary hover:text-primary/80 underline">
                    {t('terms.footer.faq', 'FAQ')}
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

export default TermsOfService;