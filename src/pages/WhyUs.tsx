
import React from 'react';
import Navbar from '@/components/Navbar';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot } from 'lucide-react';
import { PricingBasic } from '@/components/PricingBasic';

const WhyUs = () => {
  const painPoints = [
    {
      icon: Phone,
      title: "Missing Calls = Missing Money",
      description: "Every missed call is a lost customer walking straight to your competition.",
      cost: "€2,500/month in lost revenue"
    },
    {
      icon: Clock,
      title: "Manual Booking Chaos",
      description: "Hours wasted on phone tag, double bookings, and scheduling conflicts.",
      cost: "15+ hours/week lost"
    },
    {
      icon: MessageCircle,
      title: "Customers Expect Instant Response",
      description: "73% of customers abandon if they don't get immediate answers.",
      cost: "7 out of 10 customers lost"
    }
  ];

  const solutions = [
    {
      icon: Bot,
      title: "AI That Never Sleeps",
      description: "Your personal booking assistant works 24/7, handling unlimited customers simultaneously.",
      benefit: "300% more bookings"
    },
    {
      icon: Zap,
      title: "Instant Responses",
      description: "Customers get immediate answers and can book instantly via WhatsApp.",
      benefit: "Under 30 seconds response"
    },
    {
      icon: Shield,
      title: "Zero Manual Work",
      description: "Complete automation from inquiry to confirmation, including reminders and rescheduling.",
      benefit: "Save 20+ hours/week"
    }
  ];

  const proofPoints = [
    { number: "10,000+", label: "Happy Businesses", icon: Users },
    { number: "2M+", label: "Bookings Processed", icon: Calendar },
    { number: "300%", label: "Average Booking Increase", icon: TrendingUp },
    { number: "99.9%", label: "Uptime Guarantee", icon: Shield }
  ];

  const testimonials = [
    {
      quote: "In 30 days, we went from struggling to fill appointments to being fully booked 3 weeks in advance. The AI handles everything perfectly.",
      author: "Sarah Chen",
      role: "Owner, Wellness Spa",
      result: "+400% bookings",
      rating: 5
    },
    {
      quote: "I was skeptical about AI, but this changed everything. It's like having the perfect receptionist who never takes a break.",
      author: "Mike Rodriguez",
      role: "Manager, Auto Repair Shop", 
      result: "+250% revenue",
      rating: 5
    },
    {
      quote: "Setup took 5 minutes. First booking came in 10 minutes later. Best business decision I've made this year.",
      author: "Emma Thompson",
      role: "Director, Medical Clinic",
      result: "+180% efficiency",
      rating: 5
    }
  ];

  const competitorComparison = [
    { feature: "24/7 Instant Response", us: true, traditional: false },
    { feature: "No Human Errors", us: true, traditional: false },
    { feature: "Unlimited Capacity", us: true, traditional: false },
    { feature: "Works While You Sleep", us: true, traditional: false },
    { feature: "No Sick Days", us: true, traditional: false },
    { feature: "Perfect Memory", us: true, traditional: false }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section - Problem Focused */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Stop Losing Money to <span className="text-red-400">Missed Calls</span>
            </h1>
            <p className="text-2xl text-slate-300 max-w-4xl mx-auto mb-8">
              While you're busy with clients, potential customers are calling your competition. 
              Our AI ensures you <strong className="text-green-400">never miss another booking</strong>.
            </p>
            <div className="bg-red-500/20 border border-red-400 p-6 rounded-xl max-w-2xl mx-auto">
              <p className="text-xl font-semibold text-red-300">
                ⚠️ Every hour without automation = €104 in lost revenue
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

      {/* Pain Points Section */}
      <section className="py-20 px-4 bg-red-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Hidden Cost of Manual Booking
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every day you don't automate, you're literally throwing money away
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {painPoints.map((pain, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border-2 border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                  <pain.icon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{pain.title}</h3>
                <p className="text-gray-600 mb-4">{pain.description}</p>
                <div className="text-red-600 font-bold text-lg">{pain.cost}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Turn Those Problems Into <span className="text-green-600">Profit</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI doesn't just solve your booking problems - it transforms them into your biggest competitive advantage
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <div key={index} className="bg-green-50 p-8 rounded-2xl border-2 border-green-200 hover:border-green-300 transition-all">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                  <solution.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{solution.title}</h3>
                <p className="text-gray-600 mb-4">{solution.description}</p>
                <div className="text-green-600 font-bold text-lg">{solution.benefit}</div>
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
              AI vs Traditional Booking Methods
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
              Real Results from Real Businesses
            </h2>
            <p className="text-xl text-gray-600">
              Join 10,000+ businesses already profiting from AI automation
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

      {/* Urgency Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-600 to-red-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Every Day You Wait Costs You Money
          </h2>
          <p className="text-xl mb-8 opacity-90">
            While you're thinking about it, your competitors are already booking YOUR customers
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl mb-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <div className="text-3xl mb-2">⏰</div>
                <div className="font-semibold">Setup in 5 Minutes</div>
                <div className="text-sm opacity-80">Start booking immediately</div>
              </div>
              <div>
                <div className="text-3xl mb-2">💳</div>
                <div className="font-semibold">No Credit Card</div>
                <div className="text-sm opacity-80">7-day free trial</div>
              </div>
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <div className="font-semibold">Guaranteed Results</div>
                <div className="text-sm opacity-80">Or your money back</div>
              </div>
            </div>
            
            <button className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 text-xl font-bold rounded-xl transition-colors shadow-lg">
              Start My Free Trial Now
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
            
            <p className="text-sm mt-4 opacity-80">
              ✅ 7-day free trial • ✅ Cancel anytime • ✅ Setup support included
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingBasic />
    </div>
  );
};

export default WhyUs;
