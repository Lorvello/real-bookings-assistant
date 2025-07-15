const MobileFirstDataDisclaimer = ({ onMethodologyClick }: { onMethodologyClick: () => void }) => {
  return (
    <div className="-mt-4 pb-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
        <p className="text-sm text-slate-400">
          Based on mobile behavior analysis and customer preference research
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
        <button 
          onClick={onMethodologyClick}
          className="text-emerald-400 hover:text-emerald-300 transition-colors underline font-medium"
        >
          View methodology
        </button>
        <span>•</span>
        <span>Cross-platform user studies</span>
        <span>•</span>
        <span>Results may vary by demographics</span>
      </div>
    </div>
  );
};

export default MobileFirstDataDisclaimer;