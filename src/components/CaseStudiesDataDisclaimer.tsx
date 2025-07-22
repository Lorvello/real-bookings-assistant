
import React from 'react';

interface CaseStudiesDataDisclaimerProps {
  onMethodologyClick: () => void;
}

const CaseStudiesDataDisclaimer: React.FC<CaseStudiesDataDisclaimerProps> = ({ onMethodologyClick }) => {
  return (
    <div className="-mt-4 pb-4 text-center">
      <p className="text-slate-400 text-[8px] sm:text-sm mb-1 sm:mb-2 font-medium">
        <span className="inline-block w-1 sm:w-2 h-1 sm:h-2 bg-emerald-400 rounded-full mr-1 sm:mr-2"></span>
        Based on verified business performance data from in-depth case studies
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-6 text-[7px] sm:text-xs text-slate-400">
        <button
          onClick={onMethodologyClick}
          className="text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium underline decoration-emerald-400/50 hover:decoration-emerald-300"
        >
          View methodology
        </button>
        <span className="inline sm:inline text-slate-600">•</span>
        <span>6-12 month performance tracking</span>
        <span className="inline sm:inline text-slate-600">•</span>
        <span>Results vary by implementation</span>
      </div>
    </div>
  );
};

export default CaseStudiesDataDisclaimer;
