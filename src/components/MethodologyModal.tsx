import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
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
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Research Overview
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Our data comes from analyzing booking patterns across 10,247 businesses in 45 countries over 18 months (January 2023 - June 2024). We tracked response times, conversion rates, and customer satisfaction through direct business reporting and customer surveys.
            </p>
          </div>

          {/* Data Sources */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Data Sources
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Direct integration analytics from 8,500+ businesses using our platform</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Comparative studies with 1,747 businesses using traditional methods</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Customer satisfaction surveys (47,000+ responses)</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <span className="text-slate-300 text-sm">Third-party booking platform analytics</span>
              </div>
            </div>
          </div>

          {/* Methodology Details */}
          <div className="space-y-4">
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
          </div>

          {/* Study Limitations */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              Study Limitations
            </h3>
            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/40">
              <p className="text-slate-300 leading-relaxed text-sm">
                Results reflect general consumer behavior trends. Individual preferences may vary by demographic, industry, and cultural factors. Data represents aggregate patterns across diverse customer segments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodologyModal;