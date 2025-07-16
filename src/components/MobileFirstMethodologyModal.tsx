import React, { useEffect } from 'react';
import { X } from "lucide-react";
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

interface MobileFirstMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileFirstMethodologyModal: React.FC<MobileFirstMethodologyModalProps> = ({ isOpen, onClose }) => {
  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
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
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl border border-slate-600/40 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900/95 via-gray-900/95 to-slate-800/95 backdrop-blur-md border-b border-slate-600/40 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
            Mobile-First Research Methodology
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
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Research Overview
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Mobile usage patterns tracked through app analytics across 50,000+ users. Customer preference surveys with 15,000+ respondents analyzing communication channel preferences and response behaviors.
            </p>
          </ScrollAnimatedSection>

          {/* Methodology Details */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={300} 
            className="space-y-4"
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Methodology Details
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">App analytics tracking user engagement patterns across mobile platforms</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Customer preference surveys measuring satisfaction across communication channels</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Response time comparisons between mobile and desktop interactions</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Satisfaction measurements via post-interaction feedback systems</span>
              </div>
            </div>
          </ScrollAnimatedSection>

          {/* Study Limitations */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={500} 
            className="space-y-4"
            config={{ threshold: 0.01, rootMargin: '50px 0px', triggerOnce: true }}
          >
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Study Limitations
            </h3>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
              <p className="text-slate-300 leading-relaxed text-sm">
                Results may vary by demographics, industry, and geographic location. Mobile behavior patterns can be influenced by device capabilities and network conditions.
              </p>
            </div>
          </ScrollAnimatedSection>
        </div>
      </div>
    </div>
  );
};

export default MobileFirstMethodologyModal;