
export const AnalyticsCard = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Analytics Section - placed directly on card background */}
      <div className="absolute top-3 left-3 right-3 bottom-3 flex items-start justify-center pt-6">
        {/* Main Analytics Grid - 4 Columns */}
        <div className="grid grid-cols-4 gap-3 w-full">
          {/* Response Time */}
          <div className="bg-primary/20 border border-primary/30 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-primary/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/25 transform group">
            <div className="text-primary text-[14px] mb-1 group-hover:text-primary/80 transition-colors duration-300">⚡</div>
            <div className="text-white text-[16px] font-bold mb-1 group-hover:text-primary/90 transition-colors duration-300">2.3m</div>
            <div className="text-primary/80 text-[8px] uppercase tracking-wider group-hover:text-primary/70 transition-colors duration-300">Response</div>
          </div>
          
          {/* Views */}
          <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-secondary/30 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/25 transform group">
            <div className="text-secondary text-[14px] mb-1 group-hover:text-secondary/80 transition-colors duration-300">👁</div>
            <div className="text-white text-[16px] font-bold mb-1 group-hover:text-secondary/90 transition-colors duration-300">1.2k</div>
            <div className="text-secondary/80 text-[8px] uppercase tracking-wider group-hover:text-secondary/70 transition-colors duration-300">Views</div>
          </div>
          
          {/* Conversion */}
          <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/25 transform group">
            <div className="text-emerald-400 text-[14px] mb-1 group-hover:text-emerald-300 transition-colors duration-300">📈</div>
            <div className="text-white text-[16px] font-bold mb-1 group-hover:text-emerald-100 transition-colors duration-300">89%</div>
            <div className="text-emerald-300 text-[8px] uppercase tracking-wider group-hover:text-emerald-200 transition-colors duration-300">Convert</div>
          </div>
          
          {/* No-shows */}
          <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-3 text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-red-600/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/25 transform group">
            <div className="text-red-400 text-[14px] mb-1 group-hover:text-red-300 transition-colors duration-300">⚠</div>
            <div className="text-white text-[16px] font-bold mb-1 group-hover:text-red-100 transition-colors duration-300">8.5%</div>
            <div className="text-red-300 text-[8px] uppercase tracking-wider group-hover:text-red-200 transition-colors duration-300">No-shows</div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-slate-600/20 rounded-full" />
    </div>
  );
};
