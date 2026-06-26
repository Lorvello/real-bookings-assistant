import React, { useState, useMemo } from 'react';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { useVoiceflowChatbot } from '@/hooks/useVoiceflowChatbot';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { MessageCircle, Zap, Shield, Star, CheckCircle, HelpCircle, Phone, Mail, Search } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import { FAQSchema } from '@/components/SEO/StructuredData';

const FAQ = () => {
  useVoiceflowChatbot();
  const [searchTerm, setSearchTerm] = useState('');

  useSEO({
    title: "FAQ - Frequently Asked Questions",
    description: "Find answers to common questions about WhatsApp booking automation, pricing, features, integrations, and support. Everything you need to know.",
    canonical: "/faq",
  });

  const recommendedQuestions = [
    "What does it cost?",
    "Do you provide the WhatsApp number and calendar?",
    "For which types of businesses is this suitable?",
    "Is it difficult to set up?",
    "Can it process payments?"
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
          answer: "Customers send a WhatsApp message to your business number. Our AI understands their request, checks your availability, automatically books the appointment and sends confirmations to both parties. Everything is kept in sync with your calendar."
        },
        {
          question: "For which types of businesses is this suitable?",
          answer: "Perfect for hairdressers, dentists, physiotherapists, beauty salons, fitness studios, consultants, lawyers, massage therapists, nail studios, barbershops and all other service providers who work with appointments."
        },
        {
          question: "How much time does this save me?",
          answer: "It takes the back-and-forth of phone calls and manual scheduling off your plate. Instead of answering booking requests yourself, you can focus on your customers while the assistant handles the appointments."
        },
        {
          question: "Is it difficult to set up?",
          answer: "No. Setup usually takes just a few minutes. You connect the WhatsApp number, set up your calendar and add your services and prices, and the assistant is ready to start booking."
        }
      ]
    },
    {
      title: "Technical Questions",
      icon: Zap,
      items: [
        {
          question: "Do you provide the WhatsApp number and calendar?",
          answer: "Yes. We provide a professional WhatsApp Business number and a complete calendar system, so you can get started without needing any extra tools."
        },
        {
          question: "Does it work in multiple languages?",
          answer: "Yes. The assistant works in Dutch and English, and can handle conversations in several other languages too. We're expanding language support over time."
        },
        {
          question: "What happens if the AI makes a mistake?",
          answer: "You stay in control. You're notified of every booked appointment and can review, change or cancel any appointment from your dashboard at any time."
        },
        {
          question: "Is my data safe?",
          answer: "Yes. We are GDPR compliant, your data is stored securely on European servers, and we never sell your customer data. You can read exactly how we handle data in our Privacy Policy."
        },
        {
          question: "Can I customize the chatbot?",
          answer: "Yes. You set your own services, prices, availability and business information, and the assistant uses all of that to answer your customers accurately, as if it were your own assistant."
        }
      ]
    },
    {
      title: "Pricing & Plans",
      icon: Star,
      items: [
        {
          question: "What does it cost?",
          answer: "We offer a free plan, Starter at €30/month, Professional at €60/month, and Enterprise from €300/month. Starter and Professional come with a free 30-day trial and no credit card is required. Enterprise is tailored to your needs, so it doesn't include a free trial."
        },
        {
          question: "Are there setup costs?",
          answer: "No setup costs. You only pay the monthly subscription."
        },
        {
          question: "Can I upgrade or downgrade?",
          answer: "Yes, you can switch to a different plan. Changes take effect from your next billing period, so just let us know when you'd like to move up or down."
        },
        {
          question: "What happens if I stop?",
          answer: "You can cancel anytime and export your data. If you decide to come back later, just reach out and we'll help you pick up where you left off."
        },
        {
          question: "Is there a long-term contract?",
          answer: "No, you can cancel monthly. And if you pay annually you get a 20% discount."
        }
      ]
    },
    {
      title: "Features",
      icon: CheckCircle,
      items: [
        {
          question: "Can it reschedule and cancel appointments?",
          answer: "Yes. Customers can reschedule or cancel their appointments themselves via WhatsApp. The assistant checks new availability automatically and follows the cancellation rules you set."
        },
        {
          question: "Does it send reminders?",
          answer: "Yes. The platform can send automatic appointment reminders by email, and you control when they go out, so customers are less likely to forget their appointment."
        },
        {
          question: "Can it process payments?",
          answer: "Yes. You can ask customers to pay a deposit or prepay when they book, securely through Stripe. It's optional and you set it per service."
        },
        {
          question: "Does it help reduce no-shows?",
          answer: "Yes. Automatic reminders keep the appointment top of mind for your customers, which helps reduce no-shows."
        },
        {
          question: "Can I offer multiple services?",
          answer: "Absolutely. You can set different services, each with their own price and duration, and the assistant guides customers to the right one."
        }
      ]
    },
    {
      title: "Support",
      icon: Shield,
      items: [
        {
          question: "What type of support can I get?",
          answer: "You can reach us by email, and there's a built-in chatbot for quick questions. Professional and Enterprise plans get priority support."
        },
        {
          question: "How quickly do I get a response?",
          answer: "We aim to reply quickly, usually within one business day, and faster for customers on higher plans."
        },
        {
          question: "Is training available?",
          answer: "Yes. We provide onboarding guides to help you get set up, and Enterprise customers get hands-on help."
        },
        {
          question: "Can your team set it up for me?",
          answer: "For Enterprise customers we offer a done-for-you setup. Other plans have step-by-step guides and support to make setup easy."
        }
      ]
    },
    {
      title: "Website & Calendar",
      icon: Zap,
      items: [
        {
          question: "Does it work with my website?",
          answer: "Yes. You can add a WhatsApp link or QR code to your website that takes customers straight to your booking assistant."
        },
        {
          question: "What's included in the professional calendar system?",
          answer: "Our calendar system includes automatic appointment scheduling, conflict detection, availability management and per-service settings, all ready to use from day one."
        }
      ]
    },
    {
      title: "Advanced Features",
      icon: Star,
      items: [
        {
          question: "Can it manage multiple locations?",
          answer: "Professional and Enterprise plans support multiple calendars, so you can manage more than one location or team member from a single dashboard."
        },
        {
          question: "Are analytics available?",
          answer: "Yes. Professional and Enterprise plans include analytics on your bookings, so you can see how your schedule is performing."
        }
      ]
    },
    {
      title: "Troubleshooting",
      icon: MessageCircle,
      items: [
        {
          question: "What if WhatsApp is down?",
          answer: "WhatsApp is highly reliable. If there's ever a brief interruption, your data and bookings stay safe in your dashboard, and customers can reach the assistant again as soon as it's back."
        },
        {
          question: "My customers aren't tech-savvy, does this work?",
          answer: "Yes! WhatsApp is familiar to most people. The AI uses simple language and guides customers step by step."
        },
        {
          question: "Can I turn it off during holidays?",
          answer: "Yes. You can block off holidays or any specific dates in your availability settings, so the assistant won't offer those times to customers."
        },
        {
          question: "What if I lose my phone?",
          answer: "Your booking assistant runs on our platform, not on your personal phone. You can always log in through the web dashboard."
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can cancel from your dashboard or by contacting support. There are no cancellation fees."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 30-day free trial, so you can test everything risk-free before you pay. After that, you can cancel anytime."
        },
        {
          question: "Which countries do you support?",
          answer: "WhatsApp works worldwide, and to start we're focused on businesses in the Netherlands and the rest of Europe."
        },
        {
          question: "Is there an app?",
          answer: "Bookings Assistant runs in your web browser and works great on mobile. You can even add it to your home screen so it opens like an app, with no separate download needed."
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

  // Flatten FAQs for structured data
  const allFaqs = faqSections.flatMap(section => 
    section.items.map(item => ({
      question: item.question,
      answer: item.answer,
    }))
  );

  return (
    <PublicPageWrapper>
      <FAQSchema faqs={allFaqs} />
      <div className="min-h-screen bg-slate-900">
        <Header />
      
      {/* Hero Section - Premium Design */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-3 md:px-4 relative overflow-hidden">
        {/* Enhanced Background decoration with emerald accents */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-gradient-to-r from-emerald-600/20 via-slate-600/10 to-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-l from-emerald-500/15 via-slate-600/10 to-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-emerald-700/10 via-slate-700/5 to-emerald-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-32 right-1/4 w-32 h-32 bg-gradient-to-r from-emerald-400/20 to-emerald-600/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-emerald-600/15 to-emerald-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        
        {/* Advanced Grid pattern overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16_185_129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16_185_129,0.05)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-40"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:16px_16px] md:bg-[size:32px_32px] opacity-20"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
          {/* Floating Badge - Made smaller on mobile */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={0}
            as="div" 
            className="mb-6 md:mb-8"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-emerald-300 text-xs md:text-sm font-medium tracking-wide">Get Instant Answers</span>
            </div>
          </ScrollAnimatedSection>

          {/* Premium Main Heading - Made larger on mobile */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={200}
            as="h1" 
            className="text-3xl md:text-4xl xl:text-5xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
              Frequently Asked{' '}
            </span>
            <br className="md:hidden" />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
              Questions
            </span>
          </ScrollAnimatedSection>

          {/* Enhanced Subtitle - Made smaller on mobile */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={400}
            as="p" 
            className="text-xs md:text-lg text-slate-300 max-w-4xl mx-auto mb-8 md:mb-12 px-3 sm:px-0 leading-relaxed font-light"
          >
            Everything you need to know about our AI-powered WhatsApp booking platform.
            <br className="hidden md:block" />{' '}
            <span className="text-emerald-300">Can't find what you're looking for? Contact our support team</span>.
          </ScrollAnimatedSection>

          {/* Integrated Search Section - Made smaller on mobile */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={600}
            className="max-w-4xl mx-auto"
          >
            {/* Search Bar - Made smaller on mobile */}
            <div className="relative mb-8">
              <div className="relative">
                <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                  <Input
                    type="text"
                    placeholder="Search frequently asked questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 md:pl-12 pr-4 py-4 h-12 md:h-14 text-base md:text-lg bg-transparent border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                  />
              </div>
              {searchTerm && (
                <div className="mt-4 text-xs md:text-sm text-gray-300 text-center">
                  {filteredSections.reduce((total, section) => total + section.items.length, 0)} results found
                </div>
              )}
            </div>

            {/* Recommended Questions - Made smaller on mobile */}
            {!searchTerm && (
              <div className="text-center">
                <h3 className="text-sm md:text-lg font-semibold text-white mb-4">Popular questions:</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {recommendedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecommendedClick(question)}
                      className="bg-transparent hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm transition-all duration-300 border border-slate-600/50 hover:border-emerald-500/50"
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

      {/* FAQ Sections - Made smaller on mobile */}
      <section className="py-8 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {filteredSections.length === 0 ? (
            <ScrollAnimatedSection>
              <div className="text-center py-16">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-transparent border border-slate-700/50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Search className="w-8 h-8 md:w-12 md:h-12 text-slate-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">No results found</h3>
                <p className="text-sm text-gray-300 md:text-base mb-6">Try a different search term or view all FAQs below.</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="bg-emerald-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl text-sm font-semibold md:text-base hover:bg-emerald-600 transition-colors"
                >
                  Show all FAQs
                </button>
              </div>
            </ScrollAnimatedSection>
          ) : (
            <div className="space-y-8 md:space-y-12">
              {filteredSections.map((section, sectionIndex) => (
                <ScrollAnimatedSection 
                  key={sectionIndex} 
                  className="rounded-2xl p-4 md:p-8 transition-all duration-300"
                  delay={sectionIndex * 100}
                >
                  {/* Section Header - Made smaller on mobile */}
                  <div className="flex items-center space-x-4 mb-4 md:mb-8">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-transparent border border-slate-700/50 rounded-2xl flex items-center justify-center">
                      <section.icon className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">{section.title}</h2>
                      <div className="h-0.5 w-16 md:h-1 md:w-20 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"></div>
                    </div>
                  </div>

                  {/* FAQ Items - Made smaller on mobile */}
                  <Accordion type="single" collapsible className="w-full space-y-3 md:space-y-4">
                    {section.items.map((item, itemIndex) => (
                      <AccordionItem 
                        key={itemIndex} 
                        value={`${sectionIndex}-${itemIndex}`}
                        className="bg-transparent rounded-xl border border-slate-700/50 px-4 md:px-6 hover:bg-slate-800/20 transition-all duration-300"
                      >
                        <AccordionTrigger className="text-left hover:no-underline hover:text-emerald-400 transition-colors py-4 md:py-6">
                          <span className="font-semibold text-white text-base md:text-lg">{item.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-300 leading-relaxed pb-4 md:pb-6 text-sm md:text-base">
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
    </PublicPageWrapper>
  );
};

export default FAQ;
