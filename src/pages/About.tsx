import React from 'react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Brain, Calendar, Building2, CreditCard, MessageCircle, User } from 'lucide-react';

const About = () => {
  const techFeatures = [
    { icon: Brain, label: 'Conversational AI' },
    { icon: Calendar, label: 'Real-time Calendar' },
    { icon: Building2, label: 'Multi-tenant Architecture' },
    { icon: CreditCard, label: 'Secure Payments' },
    { icon: MessageCircle, label: 'WhatsApp Business API' },
  ];

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

        {/* Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        <Header />

        <main className="relative z-10">
          {/* Hero Section */}
          <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium mb-6">
                Our Story
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
                About{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                  BookingsAssistant
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                We got tired of watching small business owners waste hours on endless back-and-forth emails and phone tag. 
                Everyone was already on WhatsApp—so we built a system that handles booking conversations automatically.
              </p>
            </div>
          </section>

          {/* Founders Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
                Meet the Founders
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Matthew */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                        <User className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Matthew Groen</h3>
                        <p className="text-emerald-400 text-sm font-medium">Co-Founder & Lead Developer</p>
                        <p className="text-slate-500 text-sm">21 · Netherlands</p>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      The front-end architect behind BookingsAssistant. After 2 years deep in AI and automation, 
                      he saw an opportunity to bring enterprise-level booking to small businesses through WhatsApp.
                    </p>
                  </CardContent>
                </Card>

                {/* Luciano */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                        <User className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Luciano Raadgever</h3>
                        <p className="text-emerald-400 text-sm font-medium">Co-Founder & Systems Architect</p>
                        <p className="text-slate-500 text-sm">21 · Netherlands</p>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      The backend wizard with 3 years in AI automation. He architected the infrastructure 
                      connecting Supabase, n8n, and WhatsApp API into a seamless booking experience.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Why WhatsApp + Vision Combined */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <MessageCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Why WhatsApp?
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                95%+ adoption in Europe. Your customers won't download another app or create another account. 
                But they will message you at 10 PM asking about availability—and our AI responds instantly.
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-12" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Our Vision
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                Starting in the Netherlands, our goal is simple: make automated booking accessible to thousands of 
                small businesses worldwide. Every hairdresser, trainer, and consultant should be able to say 
                "Just WhatsApp me"—and have AI handle the rest.
              </p>
            </div>
          </section>

          {/* Technology Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-12">
                The Technology
              </h2>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {techFeatures.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 px-5 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full"
                  >
                    <feature.icon className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-300 text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 italic">
                But here's the thing: our customers don't need to know any of that. They just know it works.
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Let's Talk
              </h2>
              <p className="text-slate-400 mb-8">
                Want intelligent booking automation for your business?
              </p>
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8">
                <Link to="/contact">Get in touch</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </PublicPageWrapper>
  );
};

export default About;
