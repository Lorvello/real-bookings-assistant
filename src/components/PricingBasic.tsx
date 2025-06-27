
import { Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const PricingBasic = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const monthlyPrice = 49;
  const annualPrice = 39;
  const annualTotalPrice = annualPrice * 12;
  const monthlySavings = (monthlyPrice - annualPrice) * 12;

  return (
    <section className="py-16 md:py-24 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mr-2" />
            <span className="text-emerald-400 font-semibold text-sm md:text-base">Simple Pricing</span>
          </div>
          <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Start Your <span className="text-emerald-400">Free Trial</span> Today
          </h2>
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            No setup fees, no contracts. Start automating your bookings in minutes.
          </p>
        </div>

        {/* Pricing toggle */}
        <div className="flex items-center justify-center mb-8 md:mb-12">
          <div className="bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
            <div className="flex">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${
                  !isAnnual
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 relative ${
                  isAnnual
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">
                  Save ${monthlySavings}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 md:p-12 shadow-2xl max-w-2xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-4">
              Complete AI Booking System
            </h3>
            <div className="flex items-center justify-center mb-4 md:mb-6">
              <span className="text-3xl md:text-6xl font-bold text-emerald-400">
                ${isAnnual ? annualPrice : monthlyPrice}
              </span>
              <span className="text-slate-400 text-base md:text-xl ml-2">
                /month
              </span>
            </div>
            {isAnnual && (
              <div className="inline-flex items-center bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1 md:px-4 md:py-2">
                <span className="text-yellow-400 text-xs md:text-sm font-medium">
                  Billed annually (${annualTotalPrice}/year)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            {[
              "Unlimited WhatsApp conversations",
              "24/7 AI booking assistant",
              "Full calendar integration",
              "Advanced dashboard & analytics",
              "Automatic reminders & confirmations",
              "Multi-language support",
              "Complete customization",
              "Priority support"
            ].map((feature, index) => (
              <div key={index} className="flex items-center">
                <div className="w-5 h-5 md:w-6 md:h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
                  <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
                <span className="text-slate-300 text-sm md:text-base">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
            <div className="text-center">
              <h4 className="text-emerald-400 font-semibold text-sm md:text-base mb-2">
                🎉 Limited Time Offer
              </h4>
              <p className="text-slate-300 text-xs md:text-sm">
                <strong>30 days free trial</strong> + Setup assistance included
              </p>
            </div>
          </div>

          <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 md:py-4 px-6 md:px-8 rounded-xl text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 group">
            Start Free Trial
            <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          <p className="text-center text-slate-500 text-xs md:text-sm mt-4">
            No credit card required • Cancel anytime • Setup in 5 minutes
          </p>
        </div>
      </div>
    </section>
  );
};
