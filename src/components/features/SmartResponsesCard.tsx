
import { Check, X } from "lucide-react";

export const SmartResponsesCard = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Smart AI Comparison Interface - placed directly on card background */}
      <div className="absolute top-2 left-2 right-2 bottom-2 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-[10px] font-semibold">Normal</span>
            <div className="w-4 h-4 bg-emerald-500/30 rounded-full flex items-center justify-center">
              <span className="text-[8px] text-emerald-400">vs</span>
            </div>
            <span className="text-emerald-400 text-[10px] font-semibold">Smart AI</span>
          </div>
        </div>
        
        {/* Comparison Grid */}
        <div className="flex-1 space-y-2">
          {/* Comparison rows */}
          {[
            { normal: '"We are closed"', smart: '"We are closed now, but open tomorrow at 9:00. Shall I schedule an appointment?"' },
            { normal: '"Choose a service"', smart: '"Based on your last visit (haircut), I suggest: haircut + wash for €40?"' },
            { normal: '"Choose a time"', smart: '"You came last time on Thursday 3:00 PM. Same time this week?"' },
            { normal: '"Pay after appointment"', smart: '"Haircut €25, payment by cash or card. Want to confirm directly?"' },
            { normal: '"Cancellation not possible"', smart: '"Of course, which appointment would you like to cancel? Shall I suggest a new time right away?"' },
            { normal: '"Monday to Friday 9-17h"', smart: '"We are open today until 17:00. Can I still schedule you now or would you prefer tomorrow?"' },
            { normal: '"Fill in your details"', smart: '"Hello Sarah! Use the same contact details as last time?"' }
          ].map((comparison, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2 cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-red-600/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 transform">
                <div className="flex items-center gap-1 mb-1">
                  <X className="w-2 h-2 text-red-400" />
                  <span className="text-red-400 text-[7px] font-medium">Normal</span>
                </div>
                <div className="bg-red-500/10 rounded px-2 py-1">
                  <p className="text-red-300 text-[7px] leading-tight">{comparison.normal}</p>
                </div>
              </div>
              
              <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-2 cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transform">
                <div className="flex items-center gap-1 mb-1">
                  <Check className="w-2 h-2 text-emerald-400" />
                  <span className="text-emerald-400 text-[7px] font-medium">Smart AI</span>
                </div>
                <div className="bg-emerald-500/10 rounded px-2 py-1">
                  <p className="text-emerald-300 text-[7px] leading-tight">{comparison.smart}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Background accent elements */}
      <div className="absolute top-3 right-3 w-3 h-3 bg-emerald-500/20 rounded-full" />
      <div className="absolute bottom-3 left-3 w-2 h-2 bg-emerald-400/20 rounded-full" />
    </div>
  );
};
