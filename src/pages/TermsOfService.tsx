import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          to="/signup" 
          className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to registration
        </Link>

        {/* Main Card */}
        <Card className="bg-card border-border shadow-xl">
          <CardHeader className="text-center border-b border-border">
            <CardTitle className="text-3xl font-bold text-foreground">
              Terms of Service
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  1. Acceptance of terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By using our calendar booking service, you agree to these terms of service. 
                  If you do not agree to these terms, you may not use our service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  2. Service description
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Our service provides a multi-tenant calendar booking platform where businesses can:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Manage their own calendar settings</li>
                  <li>Configure appointment types</li>
                  <li>Set availability schedules</li>
                  <li>Set up automated booking processes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  3. Account and registration
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  To use our service, you must:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Provide accurate and complete information during registration</li>
                  <li>Keep your account information up to date</li>
                  <li>Be responsible for all activities under your account</li>
                  <li>Keep your password secure and not share it</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  4. Permitted use
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You may use our service for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Legitimate business activities</li>
                  <li>Managing appointments and bookings</li>
                  <li>Communication with customers about bookings</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4 mb-3">
                  It is not permitted to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Use the service for illegal activities</li>
                  <li>Send spam or unwanted messages</li>
                  <li>Attempt to hack or abuse the service</li>
                  <li>Access other users' accounts without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  5. Data protection
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We take data protection seriously. Your personal data is processed 
                  in accordance with our Privacy Policy and applicable privacy legislation, 
                  including GDPR.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  6. Service availability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We strive to keep our service available 24/7, but cannot guarantee 
                  100% uptime. Maintenance and updates may cause temporary 
                  service interruptions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  7. Payments and billing
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Payment terms are specified in your subscription. All prices 
                  are exclusive of VAT unless otherwise stated. Payments are due 
                  according to the agreed payment terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  8. Termination
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You may cancel your account at any time. We reserve the right 
                  to suspend or terminate accounts for violation of these terms 
                  or abuse of the service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  9. Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our liability is limited to the amount you have paid for 
                  the service in the 12 months preceding the claim. We are not 
                  liable for indirect or consequential damages.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  10. Changes
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms. 
                  Changes will take effect 30 days after notification via email 
                  or through our website.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  11. Applicable law
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  These terms are governed by Dutch law. Disputes 
                  will be submitted to the competent court in the Netherlands.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  12. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For questions about these terms, you can contact us:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-muted-foreground">Email: info@example.com</p>
                  <p className="text-muted-foreground">Phone: +31 20 123 4567</p>
                </div>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" style={{ backgroundColor: '#10B981' }}>
                  <Link to="/signup">
                    Back to registration
                  </Link>
                </Button>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline">
                    Privacy Policy
                  </Link>
                  <Link to="/faq" className="text-primary hover:text-primary/80 underline">
                    FAQ
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