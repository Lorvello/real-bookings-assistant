
import { LucideIcon } from "lucide-react";

interface PainPointProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const PainPoint = ({ icon: Icon, title, description, color }: PainPointProps) => {
  return (
    <div className="group text-center transition-all duration-300 cursor-pointer bg-slate-800/30 md:bg-transparent hover:bg-slate-800/50 md:hover:bg-slate-800/20 rounded-2xl p-4 md:p-0 h-full flex flex-col hover:shadow-lg hover:-translate-y-1">
      {/* Clean, minimal icon */}
      <div className="relative mb-3 md:mb-4 flex justify-center flex-shrink-0">
        <div className={`w-8 h-8 md:w-12 md:h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${color} rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300`}>
          <Icon className="w-4 h-4 md:w-6 md:h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Clean typography - Mobile optimized */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm md:text-lg sm:text-xl font-bold text-white mb-2 md:mb-2 sm:mb-3 leading-tight group-hover:text-red-200 transition-colors duration-300">
          {title}
        </h3>
        
        {/* Simple description - Better mobile spacing */}
        <p className="text-slate-300 text-xs md:text-sm sm:text-base leading-relaxed max-w-sm mx-auto group-hover:text-slate-100 transition-colors duration-300 flex-1">
          {description}
        </p>
      </div>
    </div>
  );
};

export default PainPoint;
