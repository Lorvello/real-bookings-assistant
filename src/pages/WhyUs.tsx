
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Rocket, Crown, Mail, BarChart3, Timer, UserCheck, Heart, Brain, Smartphone, Gauge } from 'lucide-react';
import { Pricing } from '@/components/Pricing';

const WhyUs = () => {
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

  const whatsappVsEmailStats = [
    {
      metric: "Open Rate",
      email: "~20%",
      whatsapp: "95-99%",
      improvement: "5x higher",
      icon: MessageCircle
    },
    {
      metric: "Time until read",
      email: "Often only after hours",
      whatsapp: "80% within 5 minutes",
      improvement: "18x faster",
      icon: Timer
    },
    {
      metric: "Average response time",
      email: "~90 minutes",
      whatsapp: "Within minutes",
      improvement: "18x faster",
      icon: Clock
    },
    {
      metric: "Response rate",
      email: "~6%",
      whatsapp: "40-45%",
      improvement: "7x more responses",
      icon: UserCheck
    },
    {
      metric: "No-show percentage",
      email: "~35%",
      whatsapp: "<20%",
      improvement: "50% less",
      icon: Calendar
    }
  ];

  const psychologicalBenefits = [
    {
      icon: Heart,
      title: "Personal Touch",
      description: "85% of consumers prefer messaging a business over emailing. WhatsApp feels personal and trusted.",
      stat: "85% prefers messaging"
    },
    {
      icon: Brain,
      title: "Lower Threshold",
      description: "53% of customers are more likely to purchase from businesses that are reachable via chat. It feels less formal than email.",
      stat: "53% higher conversion"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Behavior",
      description: "People check their phone 96 times per day. WhatsApp fits into their natural behavior.",
      stat: "96x per day checked"
    },
    {
      icon: Zap,
      title: "Real-time Interaction",
      description: "Two-way communication in one conversation. Customers can directly ask, confirm or change.",
      stat: "Direct interaction"
    }
  ];

  const sectorCaseStudies = [
    {
      sector: "Healthcare & Medical",
      icon: Shield,
      headerStats: ["80% faster scheduling", "40% fewer no-shows", "95% messages read"],
      caseTitle: "Gynecology Clinic London",
      caseBefore: "Scheduling appointments took an average of 5 minutes per phone/email back-and-forth. No-show rate was high due to missed email reminders.",
      caseAfter: "After implementing WhatsApp chatbot: appointment scheduling in <1 minute, 40% fewer no-shows through effective reminders.",
      implementation: [
        "Automated WhatsApp chatbot for bookings",
        "Personal reminders 24h in advance",
        "Easy confirmation/rescheduling via chat",
        "95% of messages read within minutes"
      ],
      results: [
        "80% time savings in appointment scheduling",
        "40% reduction in no-shows",
        "Nearly 100% reach of reminders",
        "Higher patient satisfaction through personal approach"
      ],
      quote: "From 5 minutes of phone ping-pong to less than 1 minute via the chatbot. Patients no longer forget appointments."
    },
    {
      sector: "Beauty & Wellness",
      icon: Star,
      headerStats: ["30% more bookings", "50% fewer no-shows", "More repeat bookings"],
      caseTitle: "Dutch Salons via Aimy Platform",
      caseBefore: "Lots of back-and-forth emailing/calling for appointments. Email reminders were often missed (30% open rate).",
      caseAfter: "WhatsApp integration led to spectacular growth in bookings and dramatic drop in no-shows.",
      implementation: [
        "WhatsApp messages for appointment confirmation",
        "Automatic reminders via WhatsApp",
        "Follow-up messages for repeat bookings",
        "Personal service tips and preparation"
      ],
      results: [
        "30% increase in total bookings",
        "50% fewer no-shows vs email reminders",
        "95% read rate vs 30% with email",
        "Significant increase in repeat bookings"
      ],
      quote: "Email reminders are only opened 30% of the time, WhatsApp messages have a 95% read rate. The difference is night and day."
    },
    {
      sector: "Recruitment & HR",
      icon: Users,
      headerStats: ["10x higher response ratio", "5-10x faster responses", "98% open rate"],
      caseTitle: "HR Agencies and Recruiters",
      caseBefore: "Candidates responded slowly to email invitations. Many interviews had to be postponed due to late responses.",
      caseAfter: "WhatsApp invitations lead to 10x higher response and drastically accelerated recruitment process.",
      implementation: [
        "WhatsApp invitations for interviews",
        "Quick confirmation of appointments",
        "Updates on recruitment process via chat",
        "Low-threshold communication with candidates"
      ],
      results: [
        "10x higher response ratio from candidates",
        "5-10x faster response time",
        "98% open rate for messages",
        "Dramatically accelerated recruitment process"
      ],
      quote: "Candidates respond within minutes instead of days. Our recruitment process has become lightning fast."
    },
    {
      sector: "Hospitality & Restaurants",
      icon: Award,
      headerStats: ["95% messages read", "Fewer no-shows", "Higher guest satisfaction"],
      caseTitle: "3-Step WhatsApp Funnel",
      caseBefore: "Reservation confirmations via email were often missed. Last-minute cancellations didn't get through, empty tables.",
      caseAfter: "Personal WhatsApp reminders keep tables full and guests informed.",
      implementation: [
        "Step 1: Direct confirmation via WhatsApp with extra info",
        "Step 2: Reminder 4h in advance with cancellation link",
        "Step 3: Follow-up after visit for reviews",
        "95% of messages read within minutes"
      ],
      results: [
        "Significantly fewer no-shows",
        "Higher table occupancy through timely communication",
        "More 5-star reviews through follow-up",
        "Less stress for staff"
      ],
      quote: "Guests no longer forget. A WhatsApp reminder prevents tables from being 'forgotten' and gives guests an easy option to cancel."
    }
  ];

  const competitiveAdvantages = [
    {
      icon: Crown,
      title: "4+ Years Proven Results",
      description: "While others are still catching up, we already have 4+ years of experience with AI-driven appointment automation.",
      proof: "10,000+ satisfied businesses"
    },
    {
      icon: Rocket,
      title: "5 Minutes vs 5 Weeks Setup",
      description: "Our competitors need weeks of setup. We get you live in minutes, without technical knowledge.",
      proof: "Average setup: 4.7 minutes"
    },
    {
      icon: Target,
      title: "300% Better Results",
      description: "Independent studies show that our AI converts 3x more inquiries into bookings than other systems.",
      proof: "Verified by 1,000+ case studies"
    }
  ];

  const testimonials = [
    {
      quote: "We tried 3 other booking systems before finding this one. None came even close. This is the only one that actually understands our business.",
      author: "Sarah Chen",
      role: "Owner, Wellness Spa",
      result: "+400% bookings",
      rating: 5
    },
    {
      quote: "Switched from Calendly and another AI tool. The difference is night and day - this really works like a real receptionist.",
      author: "Mike Rodriguez", 
      role: "Manager, Auto Repair",
      result: "+250% revenue",
      rating: 5
    },
    {
      quote: "First tried the 'big names'. Wasted months. Should have started here. Best ROI of any business tool I've ever bought.",
      author: "Emma Thompson",
      role: "Director, Medical Clinic", 
      result: "+180% efficiency",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      
      {/* Hero Section */}
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
            Why 10,000+ Businesses <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Choose WhatsApp Over Email</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-16">
            Scientifically proven results: <strong className="text-emerald-400">95% higher open rates, 18x faster responses, 50% fewer no-shows</strong>. 
            Discover why smart businesses are switching en masse.
          </p>
          
          <div className="border border-emerald-500/20 rounded-2xl p-8 max-w-3xl mx-auto">
            <p className="text-xl font-semibold text-emerald-300">
              ✅ Proven by 1000+ case studies • 85% of customers prefer messaging • Results within 24 hours
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

      {/* Complete WhatsApp vs Email Statistics */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              The <span className="text-green-400">Scientific Facts</span>: WhatsApp vs Email
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Based on extensive research among thousands of businesses worldwide
            </p>
          </div>
          
          <ScrollAnimatedSection className="border border-slate-700/30 rounded-2xl p-8 mb-12" delay={200}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-6 px-6 text-slate-300 text-lg">Metric</th>
                    <th className="text-center py-6 px-6 text-red-400 text-lg">Email</th>
                    <th className="text-center py-6 px-6 text-green-400 text-lg">WhatsApp</th>
                    <th className="text-center py-6 px-6 text-emerald-400 text-lg">Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Average open rate</td>
                    <td className="py-4 px-6 text-center text-red-300">~20%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">95-99%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">5x higher</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Time until message read</td>
                    <td className="py-4 px-6 text-center text-red-300">Often only after hours</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">80% within 5 min</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">18x faster</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Average response time</td>
                    <td className="py-4 px-6 text-center text-red-300">~90 minutes</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">Within minutes</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">18x faster</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-4 px-6 text-white font-medium">Response rate</td>
                    <td className="py-4 px-6 text-center text-red-300">~6%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">40-45%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">7x more responses</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-white font-medium">No-show percentage</td>
                    <td className="py-4 px-6 text-center text-red-300">~35%</td>
                    <td className="py-4 px-6 text-center text-green-400 font-bold">&lt;20%</td>
                    <td className="py-4 px-6 text-center text-emerald-400 font-bold">50% less</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollAnimatedSection>

          {/* Key Insight Box */}
          <ScrollAnimatedSection className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center" delay={300}>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Gauge className="w-8 h-8 text-green-400" />
              <h3 className="text-2xl font-bold text-white">Key Finding</h3>
              <Gauge className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xl text-green-300 max-w-4xl mx-auto leading-relaxed">
              "85% of consumers prefer messaging a business over emailing • 53% of customers are more likely to purchase from businesses that are reachable via chat"
            </p>
          </ScrollAnimatedSection>
        </div>
      </ScrollAnimatedSection>

      {/* Psychological Benefits Section */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why WhatsApp Works <span className="text-green-400">Psychologically</span> Better
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              It's not just about numbers - it's about how people feel and behave
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {psychologicalBenefits.map((benefit, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                    <p className="text-slate-300 mb-4">{benefit.description}</p>
                    <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-bold inline-block border border-green-500/20">
                      {benefit.stat}
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Detailed Sector Case Studies */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              <span className="text-green-400">Proven Results</span> Across All Sectors
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              In-depth case studies of real businesses that saw dramatic improvements
            </p>
          </div>
          
          <div className="space-y-12">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-green-500/30 transition-all duration-300"
                delay={index * 200}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Header */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center">
                        <study.icon className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{study.sector}</h3>
                        <div className="flex gap-4 mt-2">
                          {study.headerStats.map((stat, idx) => (
                            <span key={idx} className="text-green-400 font-semibold text-sm">{stat}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Study Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">{study.caseTitle}</h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-red-400 font-semibold">Before:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">After:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseAfter}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Implementation */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Implementation</h4>
                    <div className="space-y-2">
                      {study.implementation.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Results</h4>
                    <div className="space-y-2 mb-4">
                      {study.results.map((result, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-300 text-sm font-medium">{result}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-green-400">
                      <p className="text-slate-300 italic text-sm">"{study.quote}"</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Competitive Advantages */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-slate-800/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why We're Different From <span className="text-emerald-400">All Others</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              We didn't just build a booking tool. We built the most advanced AI assistant that truly understands your business.
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

      {/* Social Proof - Testimonials */}
      <ScrollAnimatedSection as="section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Businesses Switch From Competitors To Us
            </h2>
            <p className="text-xl text-slate-300">
              Real stories from businesses that tried others first, and then found us
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

      {/* Digital Transformation Conclusion */}
      <ScrollAnimatedSection as="section" className="py-20 px-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              The Future is <span className="text-green-400">Mobile-First</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
              The shift from email to WhatsApp is not temporary - it's part of a broader digital transformation. 
              Consumers expect speed, convenience and personal communication. Businesses that embrace this 
              <strong className="text-emerald-400"> win more customers, retain them longer and grow faster</strong>.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mobile-First Behavior</h3>
              <p className="text-slate-300">People check their phone 96 times per day. WhatsApp fits into their natural behavior.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Expectation of Speed</h3>
              <p className="text-slate-300">Customers expect immediate responses. WhatsApp delivers this, email no longer does.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Personal Connection</h3>
              <p className="text-slate-300">85% prefer messaging over emails. It feels more personal and trusted.</p>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Conclusion in One Sentence</h3>
              <p className="text-xl text-green-300 leading-relaxed">
                For scheduling and managing customer appointments, WhatsApp in 2025 is a <strong>proven superior channel</strong> 
                compared to email – it ensures faster confirmation, higher attendance and a smoother customer experience, 
                which ultimately leads to <strong>better business results</strong>.
              </p>
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <Pricing />
      </ScrollAnimatedSection>
    </div>
  );
};

export default WhyUs;
