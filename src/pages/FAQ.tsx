import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqSections = [
    {
      title: "General Questions",
      items: [
        {
          question: "What is your WhatsApp booking platform?",
          answer: "Our platform is an AI-powered WhatsApp assistant that automatically books, confirms, and manages appointments for service-based businesses. Customers can make appointments 24/7 via WhatsApp without any manual intervention from you."
        },
        {
          question: "How does it work exactly?",
          answer: "Customers send a WhatsApp message to your business number. Our AI understands their request, checks your availability, automatically books the appointment, and sends confirmations to both parties. Everything syncs with your calendar."
        },
        {
          question: "What types of businesses is this suitable for?",
          answer: "Perfect for hair salons, dentists, physiotherapists, beauty salons, fitness studios, consultants, lawyers, massage therapists, nail studios, barbershops, and all other service providers who make appointments."
        },
        {
          question: "How much time does this save me?",
          answer: "On average, our clients save 10-15 hours per week on phone answering and appointment scheduling. You can focus completely on your clients instead of administration."
        },
        {
          question: "Is it difficult to set up?",
          answer: "No! Setup usually takes 5-10 minutes. You connect your WhatsApp number, import your calendar, and the AI automatically learns your services and prices."
        }
      ]
    },
    {
      title: "Technical Questions",
      items: [
        {
          question: "Do I need a business WhatsApp number?",
          answer: "It's recommended. You use our business WhatsApp number that we will give you, but you can also use your own if needed."
        },
        {
          question: "Which calendars does it integrate with?",
          answer: "Google Calendar, Outlook, Apple Calendar, Calendly, and most popular calendar applications. Also CRM systems like Notion, Airtable, and HubSpot."
        },
        {
          question: "Does it work in multiple languages?",
          answer: "Yes! Our AI speaks fluent English, Dutch, Spanish, French, German, and 20+ other languages. You can adjust the tone and style to match your business."
        },
        {
          question: "What happens if our AI makes a mistake?",
          answer: "The AI does not make mistakes. You always get notifications of booked appointments and can cancel or modify them within 5 minutes."
        },
        {
          question: "Is my data secure?",
          answer: "Absolutely. We are GDPR compliant, use end-to-end encryption, and have SOC 2 certification. Your customer data is never shared."
        },
        {
          question: "Can I customize the chatbot?",
          answer: "Yes! You can fully customize the personality, responses, services, prices, and availability. It feels like your personal assistant."
        }
      ]
    },
    {
      title: "Pricing & Plans",
      items: [
        {
          question: "What does it cost?",
          answer: "Starter starts at €20/month, Professional €48/month, and Enterprise custom pricing. Starter and Professional plans have a free 7-day trial. Enterprise does not have a free trial."
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
          question: "What happens if I cancel?",
          answer: "You can always export your data. We retain your data for 30 days after cancellation in case you want to return."
        },
        {
          question: "Is there a long-term contract?",
          answer: "No, you can cancel monthly. However, you get 20% discount with annual payment."
        }
      ]
    },
    {
      title: "Features",
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
          answer: "Absolutely. You can set up different services, prices, and durations. The AI understands what customers want."
        },
        {
          question: "Does it work for group appointments?",
          answer: "Yes, you can set up group classes, workshops, or events with maximum number of participants."
        }
      ]
    },
    {
      title: "Support",
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
          answer: "Yes! We offer free onboarding sessions, video tutorials, and for Enterprise customers, personalized training."
        },
        {
          question: "Can your team set it up for me?",
          answer: "For Enterprise customers we do \"done-for-you\" setup. For other plans we have detailed guides and support."
        }
      ]
    },
    {
      title: "Integrations",
      items: [
        {
          question: "Which CRM systems are supported?",
          answer: "Notion, Airtable, HubSpot, Salesforce, Pipedrive, and many others via API connections."
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
          question: "Does it integrate with email marketing?",
          answer: "Yes, we can automatically add customers to your Mailchimp, Klaviyo, or other email lists."
        }
      ]
    },
    {
      title: "Advanced Features",
      items: [
        {
          question: "Can it manage multiple locations?",
          answer: "Enterprise customers can manage unlimited locations and numbers from one dashboard."
        },
        {
          question: "Are analytics available?",
          answer: "Yes! Detailed reports on booking rates, popular times, no-show percentages, and revenue tracking."
        },
        {
          question: "Can it screen customers?",
          answer: "Yes, you can set up pre-booking questions to qualify new customers before they book."
        },
        {
          question: "Does it work with waitlists?",
          answer: "Yes! When you're fully booked, customers can join the waitlist and automatically get notified of cancellations."
        },
        {
          question: "Can it upsell?",
          answer: "Absolutely. The AI can suggest additional services, products, or longer sessions during the booking process."
        }
      ]
    },
    {
      title: "Troubleshooting",
      items: [
        {
          question: "What if WhatsApp is down?",
          answer: "We have backup systems and can temporarily switch to SMS or email notifications."
        },
        {
          question: "My customers aren't tech-savvy, will this work?",
          answer: "Yes! WhatsApp is familiar to most people. The AI uses simple language and guides customers step by step."
        },
        {
          question: "Can I turn it off during holidays?",
          answer: "Yes, you can activate vacation mode that informs customers about your absence and when you'll return."
        },
        {
          question: "What if I lose my phone?",
          answer: "Your WhatsApp Business account is linked to our platform, not your phone. You can always log in via the web interface."
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can cancel anytime from your dashboard or by contacting support. No cancellation fees."
        },
        {
          question: "Do you offer refunds?",
          answer: "We offer a 7-day free trial, so you can test everything risk-free. After that, no refunds but you can cancel anytime."
        },
        {
          question: "Can I pause my subscription?",
          answer: "Enterprise customers can pause their subscription. Other plans need to cancel and restart when ready."
        },
        {
          question: "What countries do you support?",
          answer: "We support businesses worldwide, with local phone number support in 50+ countries."
        },
        {
          question: "Is there an app?",
          answer: "Yes! We have mobile apps for iOS and Android to manage your bookings on the go."
        },
        {
          question: "Can multiple team members access the dashboard?",
          answer: "Professional and Enterprise plans support multiple team member access with different permission levels."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <ScrollAnimatedSection className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about our AI-powered WhatsApp booking platform. 
            Can't find what you're looking for? Contact our support team.
          </p>
        </ScrollAnimatedSection>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, sectionIndex) => (
            <ScrollAnimatedSection 
              key={sectionIndex} 
              className="bg-gray-50 rounded-xl p-6"
              delay={sectionIndex * 100}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">
                {section.title}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, itemIndex) => (
                  <AccordionItem 
                    key={itemIndex} 
                    value={`${sectionIndex}-${itemIndex}`}
                    className="border-gray-200"
                  >
                    <AccordionTrigger className="text-left hover:no-underline hover:text-green-600 transition-colors">
                      <span className="font-medium text-gray-900">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollAnimatedSection>
          ))}
        </div>

        {/* Contact CTA */}
        <ScrollAnimatedSection 
          className="mt-16 text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8"
          delay={800}
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team is here to help you get started with AI-powered booking automation. 
            Get in touch and we'll answer any questions you have.
          </p>
          <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg">
            Contact Support
          </button>
        </ScrollAnimatedSection>
      </div>
    </div>
  );
};

export default FAQ;
