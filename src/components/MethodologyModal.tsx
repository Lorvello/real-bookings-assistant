
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  const [showContent, setShowContent] = useState(false);

  // Body scroll lock and content animation trigger
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Delay content animation to ensure modal is fully rendered
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      setShowContent(false);
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl border border-slate-600/40 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 sm:from-slate-900/95 sm:via-gray-900/95 sm:to-slate-800/95 backdrop-blur-md border-b border-slate-600/40 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
            Research Methodology
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/40 hover:border-slate-500/60 transition-all duration-300 group"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-300" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Research Overview */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={100} 
            className="space-y-4"
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Research Overview
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Our data comes from analyzing booking patterns across 10,247 businesses in 45 countries over 18 months (January 2023 - June 2024). We tracked response times, conversion rates, and customer satisfaction through direct business reporting, customer surveys, and third-party analytics.
            </p>
          </ScrollAnimatedSection>

          {/* Methodology Details */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={300} 
            className="space-y-4"
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Methodology Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Response time measured from initial customer contact to business reply</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Booking completion tracked from first inquiry to confirmed appointment</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">No-show rates measured over 90-day periods with comparative analysis</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Customer satisfaction via post-booking surveys (1-10 scale) across 47,000+ responses</span>
              </div>
            </div>
          </ScrollAnimatedSection>

          {/* Study Limitations */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={500} 
            className="space-y-4"
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true, forceVisible: showContent }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Study Limitations
            </h3>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
              <p className="text-slate-300 leading-relaxed text-sm">
                Results may vary by industry, business size, and implementation quality. Data represents businesses actively using automated systems vs manual processes.
              </p>
            </div>
          </ScrollAnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default MethodologyModal;
