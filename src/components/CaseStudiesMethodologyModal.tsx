
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface CaseStudiesMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CaseStudiesMethodologyModal: React.FC<CaseStudiesMethodologyModalProps> = ({ isOpen, onClose }) => {
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
            Case Studies Methodology
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
              Our case studies methodology involves comprehensive business performance analysis before and after WhatsApp integration. Each case study represents verified business results tracked through multiple measurement systems and validated by third-party audits over 6-12 month periods.
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
                <span className="text-slate-300 text-sm">Business performance tracked over 6-12 month periods before and after WhatsApp implementation</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Staff time measurements recorded through time-tracking systems and productivity audits</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Revenue impact calculated through booking volume analysis and missed opportunity tracking</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Customer satisfaction measured through post-service surveys and retention analysis</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Implementation success tracked through real-time calendar integration and booking analytics</span>
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
                Case studies represent individual business results. Outcomes may vary based on business size, implementation quality, staff training, and industry-specific factors. Results reflect businesses that completed full integration and training programs.
              </p>
            </div>
          </ScrollAnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default CaseStudiesMethodologyModal;
