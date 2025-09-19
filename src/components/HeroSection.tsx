import React from "react";
import { useNavigate } from 'react-router-dom';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  
  const handleStartTrial = () => {
    navigate('/signup');
  };
  
  const handleHowItWorks = () => {
    navigate('/how-it-works');
  };

  return (
    <section
      className="
        relative w-full
        text-white
      "
    >
      {/* container that allows the headline to run far to the right */}
      <div className="mx-auto w-full max-w-none px-6 sm:px-8 md:px-16 lg:px-[92px] py-16 sm:py-20 lg:py-28">
        {/* Headline */}
        <h1
          className="
            font-bold tracking-tight
            leading-[1.02]
            text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
            max-w-none
          "
        >
          <span className="block">The #1 WhatsApp Booking Assistant.</span>
          <span className="block">24/7 automated scheduling.</span>
          <span className="block">Zero missed opportunities.</span>
        </h1>

        {/* Divider */}
        <hr className="mt-10 border-t border-white/30" />

        {/* Underline row: left small label + right paragraph + CTAs under right */}
        <div
          className="
            mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8
            items-start
          "
        >
          {/* Left small label */}
          <div className="md:col-span-2 lg:col-span-2">
            <p className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.16em] text-white/70">
              WA AI AGENT • BOOKINGS
            </p>
          </div>

          {/* Right paragraph + CTAs */}
          <div className="md:col-span-10 lg:col-span-10 md:flex md:justify-end">
            <div className="md:max-w-[60ch]">
              <p className="text-base sm:text-lg text-white/85 font-sans">
                The Booking Assistant combines an AI Agent for customer booking with
                WhatsApp-native flows—on one platform that boosts conversions, cuts
                no-shows, and automates reminders and payments.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStartTrial}
                  aria-label="Start your free 30-day trial"
                  className="
                    inline-flex items-center justify-center
                    rounded-lg px-5 py-3 text-sm sm:text-base font-semibold
                    bg-[#22C55E] text-black hover:bg-[#16A34A] hover:text-white
                    transition-colors
                  "
                >
                  Start Free 30-Day Trial
                </button>
                <button
                  onClick={handleHowItWorks}
                  aria-label="See how it works"
                  className="
                    inline-flex items-center justify-center
                    rounded-lg px-5 py-3 text-sm sm:text-base font-semibold
                    border border-white/60 text-white hover:bg-white/10
                    transition-colors
                  "
                >
                  See how it works
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* optional subtle vignette / star specks if desired */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(1000px_600px_at_50%_-20%,rgba(255,255,255,.07),transparent_60%)]" />
    </section>
  );
};

export default HeroSection;