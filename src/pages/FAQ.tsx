
import React, { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { MessageCircle, Zap, Shield, Star, CheckCircle, HelpCircle, Phone, Mail, Search } from 'lucide-react';

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const recommendedQuestions = [
    "What does it cost?",
    "Do you provide the WhatsApp number and calendar?",
    "For which types of businesses is this suitable?",
    "Is it difficult to set up?",
    "Can I use my existing WhatsApp number instead?"
  ];

  const faqSections = [
    {
      title: "General Questions",
      icon: HelpCircle,
      items: [
        {
          question: "What is your WhatsApp booking platform?",
          answer: "Our platform is an AI-powered WhatsApp assistant that automatically books, confirms and manages appointments for service-oriented businesses. Customers can make appointments 24/7 via WhatsApp without any manual intervention from you."
        },
        {
          question: "How does it work exactly?",
          answer: "Customers send a WhatsApp message to your business number. Our AI understands their request, checks your availability, automatically books the appointment and sends confirmations to both parties. Everything synchronizes with your calendar."
        },
        {
          question: "For which types of businesses is this suitable?",
          answer: "Perfect for hairdressers, dentists, physiotherapists, beauty salons, fitness studios, consultants, lawyers, massage therapists, nail studios, barbershops and all other service providers who work with appointments."
        },
        {
          question: "How much time does this save me?",
          answer: "On average, our customers save 10-15 hours per week on answering phones and scheduling appointments. You can focus completely on your customers instead of administration."
        },
        {
          question: "Is it difficult to set up?",
          answer: "No! Setup usually takes 5-10 minutes. You connect your WhatsApp number, import your calendar and the AI automatically learns your services and prices."
        }
      ]
    },
    {
      title: "Technical Questions",
      icon: Zap,
      items: [
        {
          question: "Do you provide the WhatsApp number and calendar?",
          answer: "Yes! We provide you with a professional WhatsApp Business number and a complete calendar system. However, if you prefer, you can also connect your own existing WhatsApp number and calendar."
        },
        {
          question: "Can I use my existing WhatsApp number instead?",
          answer: "Absolutely! While we provide a professional WhatsApp Business number, you can choose to use your own existing number if you prefer."
        },
        {
          question: "Which calendars does it integrate with?",
          answer: "Our professional calendar system works seamlessly, but you can also connect Google Calendar, Outlook, Apple Calendar, Calendly and most popular calendar applications. Also CRM systems like Notion, Airtable and HubSpot."
        },
        {
          question: "Does it work in multiple languages?",
          answer: "Yes! Our AI speaks fluent Dutch, English, Spanish, French, German and 20+ other languages. You can adjust the tone and style to match your business."
        },
        {
          question: "What happens if the AI makes a mistake?",
          answer: "The AI doesn't make mistakes. You always get notifications of booked appointments and can cancel or modify them within 5 minutes."
        },
        {
          question: "Is my data safe?",
          answer: "Absolutely. We are GDPR compliant, use end-to-end encryption and have SOC 2 certification. Your customer data is never shared."
        },
        {
          question: "Can I customize the chatbot?",
          answer: "Yes! You can fully customize the personality, responses, services, prices and availability. It feels like your personal assistant."
        }
      ]
    },
    {
      title: "Pricing & Plans",
      icon: Star,
      items: [
        {
          question: "What does it cost?",
          answer: "Starter starts at €20/month, Professional €48/month and Enterprise custom pricing. Starter and Professional plans have a free 7-day trial. Enterprise has no free trial."
        },
        {
          question: "Are there setup costs?",
          answer: "No setup costs. You only pay the monthly subscription."
        },
        {
          question: "Can I upgrade or downgrade?",
          answer: "Yes, you can always switch between plans. Changes take effect from the next billing period."
        },
        {
          question: "What happens if I stop?",
          answer: "You can always export your data. We keep your data for 30 days after cancellation in case you want to come back."
        },
        {
          question: "Is there a long-term contract?",
          answer: "No, you can cancel monthly. However, you get 20% discount with annual payment."
        }
      ]
    },
    {
      title: "Features",
      icon: CheckCircle,
      items: [
        {
          question: "Can it reschedule and cancel appointments?",
          answer: "Yes! Customers can modify their appointments themselves via WhatsApp. The system automatically checks new availability."
        },
        {
          question: "Does it send reminders?",
          answer: "Yes, automatic reminders 24 hours and 2 hours before the appointment. You can set frequency and timing yourself."
        },
        {
          question: "Can it process payments?",
          answer: "Not directly at the moment, but we can send payment links via WhatsApp. Full payment integration is coming soon."
        },
        {
          question: "Does it handle no-shows?",
          answer: "Yes! The system detects no-shows and can automatically send follow-up messages or offer replacement appointments."
        },
        {
          question: "Can I offer multiple services?",
          answer: "Absolutely. You can set different services, prices and duration. The AI understands what customers want."
        },
        {
          question: "Does it work for group appointments?",
          answer: "Yes, you can set group classes, workshops or events with maximum number of participants."
        }
      ]
    },
    {
      title: "Support",
      icon: Shield,
      items: [
        {
          question: "What type of support can I get?",
          answer: "Starter: dedicated support. Professional: priority support. Enterprise: dedicated priority support."
        },
        {
          question: "How quickly do I get a response?",
          answer: "Dedicated support: within 24 hours. Priority support: within 4 hours. Dedicated priority support: within 1 hour."
        },
        {
          question: "Is training available?",
          answer: "Yes! We offer free onboarding sessions, video tutorials and for Enterprise customers personalized training."
        },
        {
          question: "Can your team set it up for me?",
          answer: "For Enterprise customers we do \"done-for-you\" setup. For other plans we have detailed guides and support."
        }
      ]
    },
    {
      title: "Integrations",
      icon: Zap,
      items: [
        {
          question: "Which CRM systems are supported?",
          answer: "Notion, Airtable, HubSpot, Salesforce, Pipedrive and many others via API connections."
        },
        {
          question: "Does it work with my website?",
          answer: "Yes! You can place a WhatsApp widget on your website that directly links to the booking bot."
        },
        {
          question: "Can it create social media posts?",
          answer: "Enterprise customers get automatic social media content creation and posting (Instagram, Facebook, LinkedIn)."
        },
        {
          question: "What's included in the professional calendar system?",
          answer: "Our professional calendar system includes automatic appointment scheduling, conflict detection, availability management, team coordination, and seamless integration with your existing tools - all ready to use from day one."
        }
      ]
    },
    {
      title: "Advanced Features",
      icon: Star,
      items: [
        {
          question: "Can it manage multiple locations?",
          answer: "Enterprise customers can manage unlimited locations and numbers from one dashboard."
        },
        {
          question: "Are analytics available?",
          answer: "Yes! Detailed reports on booking percentages, popular times, no-show percentages and revenue tracking."
        },
        {
          question: "Can it screen customers?",
          answer: "Yes, you can set pre-booking questions to qualify new customers before they book."
        },
        {
          question: "Does it work with waiting lists?",
          answer: "Yes! When you're fully booked, customers can join the waiting list and automatically get notified of cancellations."
        },
        {
          question: "Can it upsell?",
          answer: "Absolutely. The AI can suggest additional services, products or longer sessions during the booking process."
        }
      ]
    },
    {
      title: "Troubleshooting",
      icon: MessageCircle,
      items: [
        {
          question: "What if WhatsApp is down?",
          answer: "We have backup systems and can temporarily switch to SMS or email notifications."
        },
        {
          question: "My customers aren't tech-savvy, does this work?",
          answer: "Yes! WhatsApp is familiar to most people. The AI uses simple language and guides customers step by step."
        },
        {
          question: "Can I turn it off during holidays?",
          answer: "Yes, you can activate vacation mode that informs customers about your absence and when you'll be back."
        },
        {
          question: "What if I lose my phone?",
          answer: "Your WhatsApp Business account is linked to our platform, not to your phone. You can always log in via the web interface."
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can always cancel from your dashboard or by contacting support. No cancellation fees."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 7-day free trial, so you can test everything risk-free. After that no refunds but you can always cancel."
        },
        {
          question: "Can I pause my subscription?",
          answer: "Enterprise customers can pause their subscription. Other plans must cancel and restart when ready."
        },
        {
          question: "Which countries do you support?",
          answer: "We support businesses worldwide, with local phone number support in 50+ countries."
        },
        {
          question: "Is there an app?",
          answer: "Yes! We have mobile apps for iOS and Android to manage your bookings on the go."
        },
        {
          question: "Can multiple team members get access?",
          answer: "Professional and Enterprise plans support multiple team member access with different permission levels."
        }
      ]
    }
  ];

  // Filter FAQ sections based on search term
  const filteredSections = useMemo(() => {
    if (!searchTerm) return faqSections;

    return faqSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(section => section.items.length > 0);
  }, [searchTerm]);

  const handleRecommendedClick = (question: string) => {
    setSearchTerm(question);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="py-8 md:py-16 px-4 md:px-6 lg:px-8 relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <ScrollAnimatedSection>
            <h1 className="text-2xl md:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-6">
              Frequently Asked <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Questions</span>
            </h1>
            <p className="text-sm md:text-xl text-gray-300 max-w-4xl mx-auto mb-6 md:mb-8">
              Everything you need to know about our AI-powered WhatsApp booking platform. 
              Can't find what you're looking for? <strong className="text-emerald-400">Contact our support team</strong>.
            </p>
          </ScrollAnimatedSection>

        </div>
      </section>

      {/* Search Section */}
      <section className="py-6 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollAnimatedSection>
            {/* Search Bar */}
            <div className="relative mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search frequently asked questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-4 h-14 text-lg bg-transparent border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                  />
              </div>
              {searchTerm && (
                <div className="mt-4 text-sm text-gray-300 text-center">
                  {filteredSections.reduce((total, section) => total + section.items.length, 0)} results found
                </div>
              )}
            </div>

            {/* Recommended Questions */}
            {!searchTerm && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Popular questions:</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {recommendedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecommendedClick(question)}
                      className="bg-transparent hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 px-4 py-2 rounded-xl text-sm transition-all duration-300 border border-slate-600/50 hover:border-emerald-500/50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollAnimatedSection>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-8 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {filteredSections.length === 0 ? (
            <ScrollAnimatedSection>
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-transparent border border-slate-700/50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Search className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">No results found</h3>
                <p className="text-gray-300 mb-6">Try a different search term or view all FAQs below.</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                >
                  Show all FAQs
                </button>
              </div>
            </ScrollAnimatedSection>
          ) : (
            <div className="space-y-12">
              {filteredSections.map((section, sectionIndex) => (
                <ScrollAnimatedSection 
                  key={sectionIndex} 
                  className="rounded-2xl p-8 transition-all duration-300"
                  delay={sectionIndex * 100}
                >
                  {/* Section Header */}
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-16 h-16 bg-transparent border border-slate-700/50 rounded-2xl flex items-center justify-center">
                      <section.icon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{section.title}</h2>
                      <div className="h-1 w-20 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"></div>
                    </div>
                  </div>

                  {/* FAQ Items */}
                  <Accordion type="single" collapsible className="w-full space-y-4">
                    {section.items.map((item, itemIndex) => (
                      <AccordionItem 
                        key={itemIndex} 
                        value={`${sectionIndex}-${itemIndex}`}
                        className="bg-transparent rounded-xl border border-slate-700/50 px-6 hover:bg-slate-800/20 transition-all duration-300"
                      >
                        <AccordionTrigger className="text-left hover:no-underline hover:text-emerald-400 transition-colors py-6">
                          <span className="font-semibold text-white text-lg">{item.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-300 leading-relaxed pb-6 text-base">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollAnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default FAQ;
