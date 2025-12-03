import React from 'react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Brain, Calendar, Building2, CreditCard, MessageCircle, User } from 'lucide-react';

const About = () => {
  const techFeatures = [
    {
      icon: Brain,
      title: "Conversational AI",
      description: "Understands natural language, not rigid commands"
    },
    {
      icon: Calendar,
      title: "Real-time Calendar",
      description: "Integration with conflict prevention"
    },
    {
      icon: Building2,
      title: "Multi-tenant Architecture",
      description: "Scales from 1 to 10,000 businesses"
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Processing through Stripe Connect"
    },
    {
      icon: MessageCircle,
      title: "WhatsApp Business API",
      description: "Reliable message delivery"
    }
  ];

  return (
    <PublicPageWrapper>
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center bg-slate-50">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-8 tracking-tight">
            About BookingsAssistant
          </h1>
          
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-8">
            The Problem We Got Tired Of
          </h2>
          
          <div className="space-y-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
            <p>
              We've all been there. The endless back-and-forth emails. The phone tag. The "When are you available?" followed by "Actually, that doesn't work for me anymore."
            </p>
            <p>
              For years, we watched friends, family, and small business owners waste hours every week on something that should take seconds: booking an appointment.
            </p>
            <p>
              Meanwhile, everyone was already on WhatsApp. Chatting with friends. Coordinating with family. Why wasn't anyone using it to book appointments with their hairdresser, physiotherapist, or personal trainer?
            </p>
            <p className="text-slate-900 font-medium">
              That's when we built BookingsAssistant.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Profiles Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-16">
            Meet the Founders
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Matthew's Profile */}
            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6 border border-slate-200">
                    <User className="w-16 h-16 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Matthew Groen</h3>
                  <p className="text-emerald-600 font-medium mt-1">Co-Founder & Lead Developer</p>
                  <p className="text-sm text-slate-500 mt-2">Age: 21 | Based in Netherlands</p>
                </div>
                <p className="text-slate-600 leading-relaxed text-center">
                  Matthew is the front-end architect behind BookingsAssistant. After diving deep into AI and automation technologies over the past 2 years, he saw an opportunity to bring enterprise-level booking automation to small businesses through the world's most popular messaging platform. He builds the interfaces that make complex technology feel effortless.
                </p>
              </CardContent>
            </Card>

            {/* Luciano's Profile */}
            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6 border border-slate-200">
                    <User className="w-16 h-16 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Luciano Raadgever</h3>
                  <p className="text-emerald-600 font-medium mt-1">Co-Founder & Systems Architect</p>
                  <p className="text-sm text-slate-500 mt-2">Age: 21 | Based in Netherlands</p>
                </div>
                <p className="text-slate-600 leading-relaxed text-center">
                  Luciano is the backend wizard who makes BookingsAssistant work flawlessly behind the scenes. With 3 years of hands-on experience in AI-powered automation systems, he architected the multi-tenant infrastructure that connects Supabase, n8n workflows, and WhatsApp Business API into a seamless booking experience. His specialty: making AI conversations feel remarkably human.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why WhatsApp Section */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-8">
            <MessageCircle className="w-8 h-8 text-emerald-600" />
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8">
            Why WhatsApp?
          </h2>
          
          <div className="space-y-6 text-lg text-slate-600 leading-relaxed text-left">
            <p>
              The answer is simple: <span className="text-slate-900 font-medium">everyone already uses it.</span>
            </p>
            <p>
              In Europe, WhatsApp has 95%+ adoption. Your customers aren't going to download another app. They're not going to create another account. They're definitely not going to call during business hours.
            </p>
            <p>
              But they will send you a WhatsApp message at 10 PM asking if you're available next Tuesday.
            </p>
            <p>
              So we built a system that responds instantly, checks real-time availability, books the appointment, sends confirmations, and handles rescheduling—all through natural conversation. No apps to download. No passwords to remember. Just WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
            Our Vision
          </h2>
          
          <div className="space-y-6 text-lg text-slate-300 leading-relaxed">
            <p>
              We're starting in the Netherlands, but our goal is simple: make automated booking accessible to <span className="text-emerald-400 font-medium">thousands of small businesses worldwide</span>.
            </p>
            <p>
              The big players have enterprise booking systems. The solo practitioners and small teams deserve that same technology—without the enterprise price tag or complexity.
            </p>
            <p className="text-white font-medium text-xl">
              Every hairdresser, personal trainer, massage therapist, consultant, and healthcare professional should be able to say: "Just WhatsApp me"—and have an AI assistant handle the rest.
            </p>
            <p className="text-emerald-400 font-semibold text-xl pt-4">
              That's what we're building.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center mb-6">
            The Technology
          </h2>
          
          <p className="text-lg text-slate-600 text-center max-w-2xl mx-auto mb-12">
            BookingsAssistant combines the latest AI conversation technology with battle-tested infrastructure:
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            {techFeatures.map((feature, index) => (
              <div 
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg text-slate-600 max-w-2xl mx-auto italic">
            But here's the thing: our customers don't need to know any of that. <span className="text-slate-900 font-medium not-italic">They just know it works.</span>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Let's Talk
          </h2>
          
          <p className="text-lg text-slate-600 mb-10">
            Want to bring intelligent booking automation to your business? We'd love to hear from you.
          </p>
          
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <Link to="/contact">
              Get in touch
            </Link>
          </Button>
        </div>
      </section>
    </PublicPageWrapper>
  );
};

export default About;
