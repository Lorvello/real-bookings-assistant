
import { Calendar, Users, MessageCircle, CheckCircle, Activity } from "lucide-react";

export const MonitoringCard = () => {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Monitoring Dashboard positioned to leave room for BentoCard footer */}
      <div className="absolute top-2 left-3 right-3 bottom-24">
        <div className="h-full flex flex-col">
          {/* Stats Content */}
          <div className="flex-1 relative overflow-hidden">
            <div className="flex h-20 gap-3 px-2 mt-4">
              {/* Today Stats - Enhanced */}
              <div className="flex-1">
                <div className="h-full bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/40 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/25 transform group">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    <div className="text-white text-lg font-bold group-hover:text-emerald-100 transition-colors duration-300">5</div>
                    <div className="text-emerald-300 text-[6px] opacity-70 group-hover:opacity-100 group-hover:text-emerald-200 transition-all duration-300">+2</div>
                  </div>
                  <div className="text-emerald-300 text-xs font-medium mb-1 group-hover:text-emerald-200 transition-colors duration-300">Today</div>
                  <div className="w-full bg-emerald-800/30 rounded-full h-1">
                    <div className="bg-emerald-400 h-1 rounded-full transition-all duration-300 group-hover:bg-emerald-300" style={{width: '60%'}}></div>
                  </div>
                  <div className="text-emerald-400 text-[6px] mt-1 opacity-70 group-hover:opacity-100 group-hover:text-emerald-300 transition-all duration-300">€375 revenue</div>
                </div>
              </div>

              {/* Active Now - Enhanced */}
              <div className="flex-1">
                <div className="h-full bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/40 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/25 transform group">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="relative">
                      <Users className="h-3 w-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    </div>
                    <div className="text-white text-lg font-bold group-hover:text-emerald-100 transition-colors duration-300">3</div>
                    <CheckCircle className="h-2 w-2 text-emerald-400 opacity-70 group-hover:opacity-100 group-hover:text-emerald-300 transition-all duration-300" />
                  </div>
                  <div className="text-emerald-300 text-xs font-medium mb-1 group-hover:text-emerald-200 transition-colors duration-300">Active Now</div>
                  <div className="flex gap-1">
                    <div className="w-1 h-2 bg-emerald-400 rounded-full group-hover:bg-emerald-300 transition-colors duration-300"></div>
                    <div className="w-1 h-2 bg-emerald-400/70 rounded-full group-hover:bg-emerald-300/70 transition-colors duration-300"></div>
                    <div className="w-1 h-2 bg-emerald-400/50 rounded-full group-hover:bg-emerald-300/50 transition-colors duration-300"></div>
                  </div>
                  <div className="text-emerald-400 text-[6px] mt-1 opacity-70 group-hover:opacity-100 group-hover:text-emerald-300 transition-all duration-300">2 confirmed</div>
                </div>
              </div>

              {/* WhatsApp Live - Enhanced */}
              <div className="flex-1">
                <div className="h-full bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/40 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/25 transform group">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="relative">
                      <MessageCircle className="h-3 w-3 text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />
                    </div>
                    <div className="text-white text-lg font-bold group-hover:text-emerald-100 transition-colors duration-300">17</div>
                    <Activity className="h-2 w-2 text-emerald-400 opacity-70 group-hover:opacity-100 group-hover:text-emerald-300 transition-all duration-300" />
                  </div>
                  <div className="text-emerald-300 text-xs font-medium mb-1 group-hover:text-emerald-200 transition-colors duration-300">WhatsApp</div>
                  <div className="flex justify-center gap-0.5">
                    <div className="text-emerald-400 text-[6px] group-hover:text-emerald-300 transition-colors duration-300">12 in</div>
                    <div className="text-emerald-300 text-[6px] group-hover:text-emerald-200 transition-colors duration-300">•</div>
                    <div className="text-emerald-400 text-[6px] group-hover:text-emerald-300 transition-colors duration-300">5 out</div>
                  </div>
                  <div className="text-emerald-400 text-[6px] opacity-70 group-hover:opacity-100 group-hover:text-emerald-300 transition-all duration-300">2m avg response</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timestamp positioned in middle area between stats and BentoCard footer */}
      <div className="absolute bottom-14 left-4 right-4">
        <div className="text-center">
          <span className="text-slate-400 text-[10px]">Last update {new Date().toLocaleTimeString('en-US')}</span>
        </div>
      </div>
    </div>
  );
};
