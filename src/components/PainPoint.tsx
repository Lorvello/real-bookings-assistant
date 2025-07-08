
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
      <div className="relative mb-4 md:mb-6 flex justify-center flex-shrink-0">
        <div className={`w-12 h-12 md:w-16 md:h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${color} rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300`}>
          <Icon className="w-6 h-6 md:w-8 md:h-8 sm:w-10 sm:h-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Clean typography - Mobile optimized */}
      <div className="flex-1 flex flex-col">
        <h3 className="text-base md:text-xl sm:text-2xl font-bold text-white mb-3 md:mb-3 sm:mb-4 leading-tight group-hover:text-red-200 transition-colors duration-300">
          {title}
        </h3>
        
        {/* Simple description - Better mobile spacing */}
        <p className="text-slate-300 text-sm md:text-base sm:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-100 transition-colors duration-300 flex-1">
          {description}
        </p>
      </div>
    </div>
  );
};

export default PainPoint;
