import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
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
              Privacy Policy
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-US')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6 sm:space-y-8">
              
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  1. Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We respect your privacy and are committed to protecting your personal data. 
                  This privacy policy explains how we collect, use, store and protect your data 
                  when you use our calendar booking service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  2. What data we collect
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We collect the following categories of personal data:
                </p>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Account information:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Full name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Business name</li>
                      <li>Password (encrypted stored)</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Business data:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Business type and description</li>
                      <li>Service offerings and appointment types</li>
                      <li>Availability schedules</li>
                      <li>Booking settings</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Usage data:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Login activity and session data</li>
                      <li>IP address and browser information</li>
                      <li>Platform usage statistics</li>
                      <li>Error logs and technical diagnostics</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Eye className="h-5 w-5 mr-2 text-green-500" />
                  3. How we use your data
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We use your personal data for the following purposes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Providing and maintaining our calendar booking service</li>
                  <li>Processing bookings and appointments</li>
                  <li>Sending confirmation and reminder emails</li>
                  <li>Providing customer service and technical support</li>
                  <li>Improving our service and user experience</li>
                  <li>Complying with legal obligations</li>
                  <li>Preventing fraud and abuse</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-green-500" />
                  4. Data sharing and disclosure
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We do not share your personal data with third parties, except in the following cases:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>With your consent:</strong> When you have explicitly consented to sharing</li>
                  <li><strong>Service providers:</strong> Trusted partners who help us deliver the service (hosting, email, payment)</li>
                  <li><strong>Legal requirements:</strong> When required by law or court orders</li>
                  <li><strong>Business transfer:</strong> In case of merger, acquisition or sale of business parts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  5. Data security
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We implement appropriate technical and organizational measures to protect your data:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Technical security:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>SSL/TLS encryption</li>
                      <li>Secure databases</li>
                      <li>Regular security updates</li>
                      <li>Access controls</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-medium text-foreground mb-2">Organizational security:</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                      <li>Limited access to data</li>
                      <li>Regular security audits</li>
                      <li>Employee training</li>
                      <li>Incident response procedures</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                  6. Your rights under GDPR
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  As an EU resident, you have the following rights regarding your personal data:
                </p>
                <div className="space-y-3">
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Right of access</h3>
                    <p className="text-sm text-muted-foreground">You can request a copy of all personal data we have about you</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Right to rectification</h3>
                    <p className="text-sm text-muted-foreground">You can request correction of incorrect or incomplete data</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Right to erasure</h3>
                    <p className="text-sm text-muted-foreground">You can request deletion of your personal data</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-medium text-foreground mb-1">Right to data portability</h3>
                    <p className="text-sm text-muted-foreground">You can request your data in a machine-readable format</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-green-500" />
                  7. Data retention
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  We only retain your data as long as necessary for the purposes for which it was collected:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li><strong>Active accounts:</strong> As long as your account is active</li>
                  <li><strong>Closed accounts:</strong> Up to 30 days after closure (unless legally required otherwise)</li>
                  <li><strong>Booking data:</strong> Up to 7 years for administrative purposes</li>
                  <li><strong>Log files:</strong> Maximum 12 months</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  8. Cookies and tracking
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Our website uses cookies and similar technologies for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-6">
                  <li>Remembering your preferences and login status</li>
                  <li>Analyzing website usage for improvements</li>
                  <li>Providing personalized user experience</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  You can manage cookies through your browser settings, but this may affect functionality.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  9. Changes to this privacy policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this privacy policy from time to time. We will notify you of important changes 
                  via email or a prominent notice on our website. The date of the last change is always 
                  displayed at the top of this document.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-500" />
                  10. Contact and questions
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  For questions about this privacy policy or exercising your rights, you can contact us:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> privacy@example.com</p>
                    <p className="text-muted-foreground"><strong>Phone:</strong> +31 20 123 4567</p>
                    <p className="text-muted-foreground"><strong>Address:</strong> [Company Address]</p>
                    <p className="text-muted-foreground"><strong>Data Protection Officer:</strong> dpo@example.com</p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mt-3 text-sm">
                  You also have the right to file a complaint with the Data Protection Authority 
                  if you believe we are not handling your data correctly.
                </p>
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
                  <Link to="/terms-of-service" className="text-primary hover:text-primary/80 underline">
                    Terms of Service
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

export default PrivacyPolicy;