
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface PsychologyMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PsychologyMethodologyModal: React.FC<PsychologyMethodologyModalProps> = ({ isOpen, onClose }) => {
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
      <div className="relative w-full max-w-sm sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl border border-slate-600/40 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 sm:from-slate-900/95 sm:via-gray-900/95 sm:to-slate-800/95 backdrop-blur-md border-b border-slate-600/40 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
            Psychology Research Methodology
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
              Our psychological behavior research analyzed consumer messaging preferences and purchase patterns across 25,000+ customers in 15 countries. We examined how communication channels affect customer decision-making and engagement patterns.
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
                <span className="text-slate-300 text-sm">Consumer messaging preferences measured through survey of 25,000+ customers across 15 countries</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Purchase likelihood tracked via behavioral analysis comparing chat vs email customer journeys</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Mobile usage patterns analyzed through app analytics and user behavior tracking over 12-month period</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Communication preference data collected via post-interaction surveys and customer interviews</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Psychological response patterns measured through A/B testing across different communication channels</span>
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
                Results reflect general consumer behavior trends. Individual preferences may vary by demographic, industry, and cultural factors. Data represents aggregate patterns across diverse customer segments.
              </p>
            </div>
          </ScrollAnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default PsychologyMethodologyModal;
