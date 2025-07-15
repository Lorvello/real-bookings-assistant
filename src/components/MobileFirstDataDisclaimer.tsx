const MobileFirstDataDisclaimer = ({ onMethodologyClick }: { onMethodologyClick: () => void }) => {
  return (
    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 mt-8">
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Based on mobile behavior analysis and customer preference research
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <button 
              onClick={onMethodologyClick}
              className="text-primary hover:text-primary/80 transition-colors underline font-medium"
            >
              View methodology
            </button>
            <span>•</span>
            <span>Cross-platform user studies</span>
            <span>•</span>
            <span>Results may vary by demographics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFirstDataDisclaimer;