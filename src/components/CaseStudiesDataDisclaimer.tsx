import React from 'react';

interface CaseStudiesDataDisclaimerProps {
  onMethodologyClick: () => void;
}

const CaseStudiesDataDisclaimer: React.FC<CaseStudiesDataDisclaimerProps> = ({ onMethodologyClick }) => {
  return (
    <div className="-mt-4 pb-4 text-center">
      <p className="text-slate-400 text-sm mb-2 font-medium">
        <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
        Based on verified business performance data from in-depth case studies
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-slate-400">
        <button
          onClick={onMethodologyClick}
          className="text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium underline decoration-emerald-400/50 hover:decoration-emerald-300"
        >
          View methodology
        </button>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span>6-12 month performance tracking</span>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span>Results vary by implementation</span>
      </div>
    </div>
  );
};

export default CaseStudiesDataDisclaimer;