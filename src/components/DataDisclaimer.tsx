import React from 'react';

interface DataDisclaimerProps {
  onMethodologyClick: () => void;
}

const DataDisclaimer: React.FC<DataDisclaimerProps> = ({ onMethodologyClick }) => {
  return (
    <div className="py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 text-center">
          <p className="text-slate-300 text-sm md:text-base mb-4 font-medium">
            Based on data from 10,000+ businesses worldwide
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm text-slate-400">
            <button
              onClick={onMethodologyClick}
              className="text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium underline decoration-emerald-400/50 hover:decoration-emerald-300"
            >
              View methodology
            </button>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Data updated monthly</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Results may vary by industry</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDisclaimer;