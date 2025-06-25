
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";

const Solution = () => {
  return (
    <section className="py-8 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Compact mobile */}
        <div className="text-center mb-8 md:mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 md:px-6 md:py-3 mb-3 md:mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs md:text-sm font-medium">The Solution</span>
          </div>
          
          <h2 className="text-2xl md:text-5xl xl:text-6xl font-bold text-white mb-3 md:mb-6 leading-tight px-2 md:px-0">
            Meet Your <span className="text-emerald-400">24/7</span><br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Booking Assistant
            </span>
          </h2>
          <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
            The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human could.
          </p>
        </div>
        
        {/* Features grid - Compact mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-16">
          {/* Feature 1 */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 md:px-0">
            <div className="relative mb-4 md:mb-8 flex justify-center">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <MessageCircle className="w-6 h-6 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 leading-tight group-hover:text-emerald-300 transition-colors duration-300">
              Instant WhatsApp Responses
            </h3>
            <p className="text-slate-300 text-sm md:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-3 md:mb-6">
              Responds within seconds to every message, 24/7. Your customers get immediate answers 
              to their questions and available time slots.
            </p>
            <div className="flex items-center justify-center text-emerald-400 font-semibold text-xs md:text-base">
              <Clock className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span>Average response: 3 seconds</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 md:px-0">
            <div className="relative mb-4 md:mb-8 flex justify-center">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Brain className="w-6 h-6 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 leading-tight group-hover:text-blue-300 transition-colors duration-300">
              Smart Conversations
            </h3>
            <p className="text-slate-300 text-sm md:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-3 md:mb-6">
              Understands context, asks the right questions, and guides customers 
              to the perfect appointment time that works for everyone.
            </p>
            <div className="flex items-center justify-center text-blue-400 font-semibold text-xs md:text-base">
              <Users className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span>98% customer satisfaction</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-4 md:px-0 md:col-span-2 lg:col-span-1">
            <div className="relative mb-4 md:mb-8 flex justify-center">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Target className="w-6 h-6 md:w-10 md:h-10 text-white" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 leading-tight group-hover:text-purple-300 transition-colors duration-300">
              Perfect For Every Business
            </h3>
            <p className="text-slate-300 text-sm md:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 mb-3 md:mb-6">
              Salons, clinics, gyms, consultants - if you book appointments, 
              our AI adapts to your specific business needs.
            </p>
            <div className="flex items-center justify-center text-purple-400 font-semibold text-xs md:text-base">
              <TrendingUp className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2" />
              <span>300% more bookings avg.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
