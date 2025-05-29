
import React from 'react';
import Navbar from '@/components/Navbar';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Rocket, Crown } from 'lucide-react';
import { PricingBasic } from '@/components/PricingBasic';

const WhyUs = () => {
  const competitiveAdvantages = [
    {
      icon: Crown,
      title: "Market Leader Since 2020",
      description: "While others are catching up, we've already perfected AI booking automation with 4+ years of experience.",
      proof: "10,000+ businesses trust us"
    },
    {
      icon: Rocket,
      title: "5-Minute Setup vs 5-Week Implementation",
      description: "Our competitors need weeks of setup and training. We get you live in minutes with zero technical knowledge required.",
      proof: "Average setup: 4.7 minutes"
    },
    {
      icon: Target,
      title: "300% Better Results Than Competitors",
      description: "Independent studies show our AI converts 3x more inquiries to bookings compared to other booking systems.",
      proof: "Verified by 1,000+ case studies"
    }
  ];

  const whyChooseUs = [
    {
      icon: Bot,
      title: "Most Advanced AI in the Industry",
      description: "Our proprietary AI understands context, handles complex requests, and learns your business patterns - something generic chatbots simply can't do.",
      benefit: "97% customer satisfaction"
    },
    {
      icon: Shield,
      title: "Enterprise Security, Startup Price",
      description: "Bank-level encryption and GDPR compliance that usually costs €500+/month, included in every plan starting at €25.",
      benefit: "Enterprise features for everyone"
    },
    {
      icon: Zap,
      title: "Only Provider with True WhatsApp Integration",
      description: "Direct integration with WhatsApp Business API - not just web widgets. Your customers book where they already are.",
      benefit: "Native WhatsApp experience"
    }
  ];

  const proofPoints = [
    {
      number: "10,000+",
      label: "Businesses Choose Us",
      icon: Users
    },
    {
      number: "2M+",
      label: "Successful Bookings",
      icon: Calendar
    },
    {
      number: "300%",
      label: "Better Than Competitors",
      icon: TrendingUp
    },
    {
      number: "99.9%",
      label: "Uptime Guarantee",
      icon: Shield
    }
  ];

  const testimonials = [
    {
      quote: "We tried 3 other booking systems before this one. None even came close. This is the only one that actually understands our business.",
      author: "Sarah Chen",
      role: "Owner, Wellness Spa",
      result: "+400% bookings",
      rating: 5
    },
    {
      quote: "Switched from Calendly and another AI tool. The difference is night and day - this actually works like having a real receptionist.",
      author: "Mike Rodriguez", 
      role: "Manager, Auto Repair Shop",
      result: "+250% revenue",
      rating: 5
    },
    {
      quote: "Tried the 'big names' first. Wasted months. Should have started here. Best ROI of any business tool I've ever bought.",
      author: "Emma Thompson",
      role: "Director, Medical Clinic", 
      result: "+180% efficiency",
      rating: 5
    }
  ];

  const competitorComparison = [
    {
      feature: "5-Minute Setup",
      us: true,
      traditional: false
    },
    {
      feature: "True WhatsApp Integration",
      us: true,
      traditional: false
    },
    {
      feature: "Understands Context & Intent",
      us: true,
      traditional: false
    },
    {
      feature: "Learns Your Business",
      us: true,
      traditional: false
    },
    {
      feature: "No Monthly Limits",
      us: true,
      traditional: false
    },
    {
      feature: "Enterprise Security Included",
      us: true,
      traditional: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section - Why Choose Us */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Why 10,000+ Businesses Choose <span className="text-green-400">Us Over Everyone Else</span>
            </h1>
            <p className="text-2xl text-slate-300 max-w-4xl mx-auto mb-8">
              While our competitors promise, we <strong className="text-green-400">deliver proven results</strong>. 
              Here's exactly why smart businesses choose us over the alternatives.
            </p>
            <div className="bg-green-500/20 border border-green-400 p-6 rounded-xl max-w-2xl mx-auto">
              <p className="text-xl font-semibold text-green-300">
                ✅ 4+ years of proven results • 300% better than competitors • Enterprise-grade for everyone
              </p>
            </div>
          </div>
          
          {/* Social Proof Stats */}
          <div className="grid md:grid-cols-4 gap-8">
            {proofPoints.map((stat, index) => (
              <div key={index} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <stat.icon className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Advantages Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What Makes Us Different From Everyone Else
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We didn't just build another booking tool. We built the most advanced AI assistant that actually understands your business.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {competitiveAdvantages.map((advantage, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <advantage.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{advantage.title}</h3>
                <p className="text-gray-600 mb-4">{advantage.description}</p>
                <div className="text-green-600 font-bold text-sm bg-green-50 px-3 py-2 rounded-lg inline-block">
                  {advantage.proof}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The <span className="text-green-600">Only Platform</span> That Delivers On Every Promise
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop settling for "good enough" solutions. Get the industry-leading platform that actually works as advertised.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {whyChooseUs.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-green-50 to-green-100/50 p-8 rounded-2xl border border-green-200 hover:border-green-300 transition-all">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="text-green-700 font-bold text-lg">{feature.benefit}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Us vs Traditional */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Us vs Traditional Booking Methods
            </h2>
            <p className="text-xl text-gray-600">See why smart businesses are switching</p>
          </div>
          
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
              <div></div>
              <div className="bg-green-100 p-4 rounded-xl">
                <h3 className="text-xl font-bold text-green-800">Bookings Assistant AI</h3>
              </div>
              <div className="bg-red-100 p-4 rounded-xl">
                <h3 className="text-xl font-bold text-red-800">Traditional Methods</h3>
              </div>
            </div>
            
            {competitorComparison.map((item, index) => (
              <div key={index} className="grid md:grid-cols-3 gap-8 py-4 border-b border-gray-200 items-center">
                <div className="font-medium text-gray-900">{item.feature}</div>
                <div className="text-center">
                  {item.us ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <div className="w-8 h-8 text-red-600 mx-auto">❌</div>
                  )}
                </div>
                <div className="text-center">
                  {item.traditional ? (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                  ) : (
                    <div className="w-8 h-8 text-red-600 mx-auto">❌</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why Businesses Switch To Us From Competitors
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from businesses who tried others first, then found us
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic font-medium">"{testimonial.quote}"</p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.author}</div>
                    <div className="text-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                    {testimonial.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingBasic />
    </div>
  );
};

export default WhyUs;
