
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Rocket, Crown, Mail, BarChart3, Timer, UserCheck } from 'lucide-react';
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

  const whatsappStats = [
    {
      metric: "Open Rate",
      whatsapp: "95-99%",
      email: "~20%",
      icon: MessageCircle,
      improvement: "5x hoger"
    },
    {
      metric: "Reactietijd",
      whatsapp: "< 5 minuten",
      email: "~90 minuten",
      icon: Timer,
      improvement: "18x sneller"
    },
    {
      metric: "Responsrate",
      whatsapp: "40-45%",
      email: "~6%",
      icon: UserCheck,
      improvement: "7x meer reacties"
    },
    {
      metric: "No-show Rate",
      whatsapp: "< 20%",
      email: "~35%",
      icon: Calendar,
      improvement: "50% minder"
    }
  ];

  const sectorCases = [
    {
      sector: "Zorg",
      icon: Shield,
      results: ["80% snellere afspraakplanning", "40% minder no-shows", "95% berichten gelezen"],
      description: "Gynecologiekliniek in Londen zag dramatische verbetering na WhatsApp implementatie."
    },
    {
      sector: "Beauty & Wellness",
      icon: Star,
      results: ["30% meer boekingen", "50% minder no-shows", "Meer repeat bookings"],
      description: "Nederlandse salons via Aimy platform boekten spectaculaire groei."
    },
    {
      sector: "Recruitment",
      icon: Users,
      results: ["10x hogere responsratio", "5-10x snellere reacties", "98% open rate"],
      description: "HR-bureaus versnellen hun wervingsproces drastisch met WhatsApp."
    },
    {
      sector: "Horeca",
      icon: Award,
      results: ["95% berichten gelezen", "Minder no-shows", "Hogere gasttevredenheid"],
      description: "Restaurants houden tafels vol met persoonlijke WhatsApp-herinneringen."
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
      feature: "24/7 Automated Availability",
      us: true,
      traditional: false
    },
    {
      feature: "Smart Context Understanding",
      us: true,
      traditional: false
    },
    {
      feature: "Automated Reminders & Follow-ups",
      us: true,
      traditional: false
    },
    {
      feature: "Multi-Language Support",
      us: true,
      traditional: false
    },
    {
      feature: "CRM Integrations (HubSpot, Notion, etc.)",
      us: true,
      traditional: false
    },
    {
      feature: "Advanced Analytics & Insights",
      us: true,
      traditional: false
    },
    {
      feature: "Enterprise Security Included",
      us: true,
      traditional: false
    },
    {
      feature: "Unlimited Monthly Bookings",
      us: true,
      traditional: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      
      {/* Hero Section - Why Choose Us */}
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Why 10,000+ Businesses Choose <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Us Over Everyone Else</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-16">
            While our competitors promise, we <strong className="text-emerald-400">deliver proven results</strong>. 
            Here's exactly why smart businesses choose us over the alternatives.
          </p>
          
          <div className="border border-emerald-500/20 rounded-2xl p-8 max-w-2xl mx-auto">
            <p className="text-xl font-semibold text-emerald-300">
              ✅ 4+ years of proven results • 300% better than competitors • Enterprise-grade for everyone
            </p>
          </div>
        </div>
        
        {/* Social Proof Stats */}
        <div className="max-w-7xl mx-auto mt-20 relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            {proofPoints.map((stat, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="text-center"
                delay={index * 100}
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <stat.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-slate-400">{stat.label}</div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* WhatsApp vs Email Statistics Section */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Waarom <span className="text-green-400">WhatsApp</span> E-mail Verslaat in Afspraakbeheer
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Wetenschappelijk bewezen resultaten van duizenden bedrijven wereldwijd
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {whatsappStats.map((stat, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/70 transition-all duration-300"
                delay={index * 100}
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <stat.icon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{stat.metric}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">WhatsApp:</span>
                    <span className="text-white font-semibold">{stat.whatsapp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">E-mail:</span>
                    <span className="text-slate-300">{stat.email}</span>
                  </div>
                </div>
                <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-bold text-center border border-green-500/20">
                  {stat.improvement}
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Detailed Comparison Table */}
          <ScrollAnimatedSection className="border border-slate-700/30 rounded-2xl p-8 mb-16" delay={200}>
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Gedetailleerde Vergelijking</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-6 text-slate-300">Kengetal</th>
                    <th className="text-center py-4 px-6 text-green-400">WhatsApp</th>
                    <th className="text-center py-4 px-6 text-red-400">E-mail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Gemiddelde open rate</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">95-99%</td>
                    <td className="py-4 px-6 text-center text-slate-300">~20%</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Tijd tot bericht gelezen</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">80% binnen 5 min</td>
                    <td className="py-4 px-6 text-center text-slate-300">Vaak pas na uren</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Gemiddelde responstijd</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">Binnen enkele minuten</td>
                    <td className="py-4 px-6 text-center text-slate-300">~90 minuten</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Responsrate</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">40-45%</td>
                    <td className="py-4 px-6 text-center text-slate-300">~6%</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-white font-medium">No-show percentage</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">&lt;20%</td>
                    <td className="py-4 px-6 text-center text-slate-300">~35%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollAnimatedSection>
        </div>
      </ScrollAnimatedSection>

      {/* Sector Case Studies */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Bewezen Resultaten Across <span className="text-green-400">Alle Sectoren</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Van zorg tot horeca - bedrijven in elke sector zien dramatische verbeteringen
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {sectorCases.map((sector, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <sector.icon className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">{sector.sector}</h3>
                    <p className="text-slate-300 mb-4 text-sm">{sector.description}</p>
                    <div className="space-y-2">
                      {sector.results.map((result, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-green-300 text-sm font-medium">{result}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Key Insights Box */}
          <ScrollAnimatedSection className="mt-16" delay={300}>
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Belangrijkste Bevinding</h3>
              <p className="text-xl text-green-300 max-w-4xl mx-auto">
                "85% van consumenten berichten liever een bedrijf dan mailen • 53% van klanten neemt eerder iets af bij bedrijven die via chat benaderbaar zijn"
              </p>
            </div>
          </ScrollAnimatedSection>
        </div>
      </ScrollAnimatedSection>

      {/* Competitive Advantages Section */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              What Makes Us Different From Everyone Else
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We didn't just build another booking tool. We built the most advanced AI assistant that actually understands your business.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {competitiveAdvantages.map((advantage, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <advantage.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{advantage.title}</h3>
                <p className="text-slate-300 mb-4">{advantage.description}</p>
                <div className="text-emerald-400 font-bold text-sm">
                  {advantage.proof}
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Why Choose Us Features */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              The <span className="text-emerald-400">Only Platform</span> That Delivers On Every Promise
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Stop settling for "good enough" solutions. Get the industry-leading platform that actually works as advertised.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {whyChooseUs.map((feature, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-emerald-500/20 rounded-2xl p-8 hover:border-emerald-500/40 transition-all duration-300"
                delay={index * 150}
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-300 mb-4">{feature.description}</p>
                <div className="text-emerald-400 font-bold text-lg">{feature.benefit}</div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Us vs Traditional */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Us vs Traditional Booking Methods
            </h2>
            <p className="text-xl text-slate-300">See why smart businesses are switching</p>
          </div>
          
          <ScrollAnimatedSection className="border border-slate-700/30 rounded-2xl p-8" delay={200}>
            <div className="grid md:grid-cols-3 gap-8 text-center mb-8">
              <div></div>
              <div className="border border-emerald-500/30 rounded-xl p-4">
                <h3 className="text-xl font-bold text-emerald-400">Bookings Assistant AI</h3>
              </div>
              <div className="border border-red-500/30 rounded-xl p-4">
                <h3 className="text-xl font-bold text-red-400">Traditional Methods</h3>
              </div>
            </div>
            
            {competitorComparison.map((item, index) => (
              <div key={index} className="grid md:grid-cols-3 gap-8 py-4 border-b border-slate-700/30 items-center">
                <div className="font-medium text-white">{item.feature}</div>
                <div className="text-center">
                  {item.us ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  ) : (
                    <div className="w-8 h-8 text-red-400 mx-auto">❌</div>
                  )}
                </div>
                <div className="text-center">
                  {item.traditional ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  ) : (
                    <div className="w-8 h-8 text-red-400 mx-auto">❌</div>
                  )}
                </div>
              </div>
            ))}
          </ScrollAnimatedSection>
        </div>
      </ScrollAnimatedSection>

      {/* Social Proof - Testimonials */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Businesses Switch To Us From Competitors
            </h2>
            <p className="text-xl text-slate-300">
              Real stories from businesses who tried others first, then found us
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic font-medium">"{testimonial.quote}"</p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-bold text-white">{testimonial.author}</div>
                    <div className="text-slate-400 text-sm">{testimonial.role}</div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                    {testimonial.result}
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <PricingBasic />
      </ScrollAnimatedSection>
    </div>
  );
};

export default WhyUs;
