import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Zap, Scissors, Stethoscope, Dumbbell } from "lucide-react";

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
      className="flex flex-row justify-center items-center px-16 relative w-full min-h-[960px]"
      style={{
        background: 'linear-gradient(180deg, #0B1520 0%, #101B27 100%)'
      }}
    >
      <div className="flex flex-col items-start p-0 gap-20 w-full max-w-[1280px] h-auto">
        <div className="flex flex-col items-start gap-8 w-full max-w-[560px]">
          <div className="flex flex-col gap-6 w-full max-w-[560px]">
            {/* Hero headline */}
            <h1 className="font-sans font-bold text-[56px] leading-[120%] text-white">
              The #1 WhatsApp Booking Assistant.<br />
              24/7 automated scheduling.<br />
              Zero missed opportunities.
            </h1>

            {/* Supporting text */}
            <p className="font-sans font-normal text-lg leading-[150%] text-[#A0AEC0]">
              Your AI assistant books appointments via WhatsApp while you sleep — instant responses, reminders, and secure payments built in.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-row gap-4">
            <button 
              onClick={handleStartTrial}
              className="px-6 py-3 text-base leading-[150%] font-sans rounded-lg transition-all duration-200 ease-in-out bg-[#22C55E] text-white border-none hover:bg-[#16A34A]"
            >
              Start Free 30-Day Trial
            </button>
            <button 
              onClick={handleHowItWorks}
              className="px-6 py-3 text-base leading-[150%] font-sans rounded-lg transition-all duration-200 ease-in-out bg-transparent border border-white text-white hover:bg-white/10"
            >
              See how it works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;