
import React from 'react';
import Navbar from '@/components/Navbar';
import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar } from 'lucide-react';

const WhyUs = () => {
  const features = [
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption and security protocols to protect your business data and customer information.",
      highlight: "SOC 2 Compliant"
    },
    {
      icon: Zap,
      title: "Lightning Fast Setup",
      description: "Get your AI booking assistant up and running in under 5 minutes with our simple integration process.",
      highlight: "5 Min Setup"
    },
    {
      icon: Users,
      title: "24/7 Customer Success",
      description: "Dedicated support team available around the clock to ensure your success with our platform.",
      highlight: "Always Available"
    },
    {
      icon: Award,
      title: "Industry Leading",
      description: "Recognized as the #1 AI booking solution by industry experts and thousands of satisfied customers.",
      highlight: "#1 Rated"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Happy Businesses", icon: Users },
    { number: "2M+", label: "Bookings Processed", icon: Calendar },
    { number: "99.9%", label: "Uptime Guarantee", icon: Shield },
    { number: "3.2x", label: "Booking Increase", icon: TrendingUp }
  ];

  const testimonials = [
    {
      quote: "Bookings Assistant revolutionized our appointment scheduling. We've seen a 300% increase in bookings since implementation.",
      author: "Sarah Chen",
      role: "Owner, Wellness Spa",
      rating: 5
    },
    {
      quote: "The AI understands our customers perfectly. It's like having a dedicated receptionist who never sleeps.",
      author: "Mike Rodriguez",
      role: "Manager, Auto Repair Shop",
      rating: 5
    },
    {
      quote: "Setup was incredibly easy, and the results were immediate. Our customers love the instant responses.",
      author: "Emma Thompson",
      role: "Director, Medical Clinic",
      rating: 5
    }
  ];

  const advantages = [
    "No monthly contracts - pay as you grow",
    "Integrates with 50+ calendar systems",
    "Supports 25+ languages automatically",
    "Custom branding and personality",
    "Advanced analytics and insights",
    "White-label solutions available"
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Why Choose <span className="text-green-400">Bookings Assistant</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12">
            Join thousands of businesses who trust us to handle their appointment scheduling 
            with the most advanced AI booking solution in the market
          </p>
          
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
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

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What Sets Us Apart
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've built the most sophisticated AI booking platform with features that actually matter for your business
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Everything You Need, Nothing You Don't
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                We focus on what matters most - getting you more bookings with less effort. 
                No bloated features, just powerful AI that works.
              </p>
              
              <div className="space-y-4">
                {advantages.map((advantage, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{advantage}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-8 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-6">Ready to 3x Your Bookings?</h3>
              <p className="text-green-100 mb-8">
                Join the thousands of businesses already using Bookings Assistant to automate their scheduling and grow their revenue.
              </p>
              <div className="space-y-4">
                <button className="w-full bg-white text-green-600 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  Start Free Trial
                </button>
                <button className="w-full border-2 border-white text-white py-3 px-6 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                  Book a Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Loved by Businesses Everywhere
            </h2>
            <p className="text-xl text-gray-600">
              Don't just take our word for it - see what our customers say
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-gray-600 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of businesses who've already automated their booking process
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg">
              Start Free Trial - No Credit Card Required
            </button>
            <button className="border-2 border-slate-400 text-slate-300 px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-colors">
              Schedule a Demo
            </button>
          </div>
          <p className="text-slate-400 mt-4 text-sm">
            14-day free trial • Cancel anytime • Setup in 5 minutes
          </p>
        </div>
      </section>
    </div>
  );
};

export default WhyUs;
