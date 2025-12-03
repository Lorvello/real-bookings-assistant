import React from 'react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Brain, Calendar, Building2, CreditCard, MessageCircle, User, Target, Sparkles, Shield, Zap } from 'lucide-react';

const About = () => {
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
                Everyone was already on WhatsApp, so we built a system that handles booking conversations automatically.
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
                {/* Mathew */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                        <User className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Mathew Groen</h3>
                        <p className="text-emerald-400 text-sm font-medium">Co-Founder & Lead Developer</p>
                        <p className="text-slate-500 text-sm">21 · Netherlands</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>
                        The front-end architect and product visionary behind BookingsAssistant. With deep expertise in 
                        React, TypeScript, and modern web technologies, Mathew has spent 2+ years mastering AI integration 
                        and automation systems.
                      </p>
                      <p>
                        His focus on user experience and interface design ensures that complex technology feels simple 
                        and intuitive. He architected the entire customer-facing platform with scalability in mind, 
                        building systems that can grow from startup to enterprise without missing a beat.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">React</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">TypeScript</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">UX/UI</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">AI Integration</span>
                      </div>
                    </div>
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
                        <h3 className="text-xl font-bold text-white">Luciano Raatgever</h3>
                        <p className="text-emerald-400 text-sm font-medium">Co-Founder & Systems Architect</p>
                        <p className="text-slate-500 text-sm">21 · Netherlands</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-slate-300 leading-relaxed">
                      <p>
                        The backend mastermind with 3+ years of hands-on experience in AI automation and enterprise 
                        infrastructure. Luciano specializes in building robust, secure systems that handle thousands 
                        of concurrent operations without breaking a sweat.
                      </p>
                      <p>
                        His expertise spans database architecture, API development, and conversational AI design. 
                        He engineered the entire backend infrastructure connecting Supabase, n8n workflows, and the 
                        WhatsApp Business API into one seamless, secure booking experience.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">n8n Workflows</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">Supabase</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">API Design</span>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs">Security</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Combined Bento Grid Section */}
          <section className="py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-12">
                What Makes Us{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                  Different
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* WhatsApp Focus Card */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <MessageCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">WhatsApp Native</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      95%+ adoption in Europe. Your customers won't download another app or create another account. 
                      They message you at 10 PM, our AI responds instantly.
                    </p>
                  </CardContent>
                </Card>

                {/* Vision Card */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">Our Vision</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Starting in the Netherlands, our goal is simple: make automated booking accessible to thousands of 
                      small businesses worldwide. Every business should say "Just WhatsApp me."
                    </p>
                  </CardContent>
                </Card>

                {/* CTA Card */}
                <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-sm border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-600/20 transition-all duration-300">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">Let's Talk</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-grow">
                      Want intelligent booking automation for your business? We'd love to show you what's possible.
                    </p>
                    <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white w-full">
                      <Link to="/contact">Get in touch</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Technology Cards - Full Width Row */}
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 md:col-span-2 lg:col-span-3">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">The Technology Stack</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Conversational AI */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <Brain className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">Conversational AI</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Natural language understanding that grasps context and intent. No menus, no commands, just natural conversations.
                        </p>
                      </div>

                      {/* Real-time Calendar */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">Real-time Calendar</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Instant availability checks with conflict prevention. No double bookings, automatic synchronization across all channels.
                        </p>
                      </div>

                      {/* Multi-tenant Architecture */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <Building2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">Multi-tenant Architecture</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Built to scale from 1 to 10,000+ businesses with complete data isolation and enterprise-grade security.
                        </p>
                      </div>

                      {/* Secure Payments */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <CreditCard className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">Secure Payments</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          PCI-compliant payments via Stripe Connect with automatic payouts and platform fee management.
                        </p>
                      </div>

                      {/* WhatsApp Business API */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">WhatsApp Business API</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Official Meta partnership for reliable message delivery, enterprise-grade uptime, and verified business profiles.
                        </p>
                      </div>

                      {/* Security */}
                      <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-5 h-5 text-emerald-400" />
                          <span className="text-white font-medium">Enterprise Security</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          Row-level security, encrypted data storage, rate limiting, and comprehensive audit logging for complete protection.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>
      </div>
    </PublicPageWrapper>
  );
};

export default About;
