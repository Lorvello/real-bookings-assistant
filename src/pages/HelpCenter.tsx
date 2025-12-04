import { Rocket, Calendar, MessageCircle, CreditCard, Headphones, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";

const helpSections = [
  {
    icon: Rocket,
    title: "Getting Started",
    steps: [
      "Create your account",
      "Set up your calendar",
      "Add your services",
      "Share your booking link"
    ]
  },
  {
    icon: Calendar,
    title: "Managing Bookings",
    steps: [
      "View all bookings in your dashboard",
      "Confirm or cancel appointments",
      "Set your availability hours",
      "Block specific dates"
    ]
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Setup",
    steps: [
      "Connect your WhatsApp Business",
      "Generate your QR code",
      "Configure auto-replies",
      "Enable booking notifications"
    ]
  },
  {
    icon: CreditCard,
    title: "Payments",
    steps: [
      "Connect Stripe to receive payments",
      "Set prices for your services",
      "Track earnings in dashboard",
      "Manage refunds easily"
    ]
  }
];

const HelpCenter = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Header />

      <main className="relative z-10 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero */}
          <ScrollAnimatedSection className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Help <span className="text-emerald-400">Center</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Quick guides to get you up and running with BookingsAssistant
            </p>
          </ScrollAnimatedSection>

          {/* Help Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {helpSections.map((section, index) => (
              <ScrollAnimatedSection key={section.title} delay={index * 100}>
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 h-full hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  </div>
                  <ul className="space-y-2">
                    {section.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 text-slate-300">
                        <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* CTA Card */}
          <ScrollAnimatedSection delay={400}>
            <div className="bg-gradient-to-br from-emerald-500/10 to-slate-800/60 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Still have questions?</h2>
              <p className="text-slate-400 mb-6">
                Our team is here to help you get the most out of BookingsAssistant
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Contact Support
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollAnimatedSection>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
