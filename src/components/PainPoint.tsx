
import { LucideIcon } from "lucide-react";

interface PainPointProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const PainPoint = ({ icon: Icon, title, description, color }: PainPointProps) => {
  return (
    <div className="group text-center hover:transform hover:scale-105 transition-all duration-300 cursor-pointer px-3 md:px-4 sm:px-0">
      {/* Clean, minimal icon */}
      <div className="relative mb-4 md:mb-6 sm:mb-8 flex justify-center">
        <div className={`w-12 h-12 md:w-16 md:h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${color} rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
          <Icon className="w-6 h-6 md:w-8 md:h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
        </div>
        
        {/* Subtle glow effect */}
        <div className={`absolute inset-0 w-12 h-12 md:w-16 md:h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${color} rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300`}></div>
      </div>
      
      {/* Clean typography */}
      <h3 className="text-sm md:text-xl sm:text-2xl font-bold text-white mb-2 md:mb-3 sm:mb-4 leading-tight group-hover:text-red-300 transition-colors duration-300 px-2 md:px-2 sm:px-0">
        {title}
      </h3>
      
      {/* Simple description */}
      <p className="text-slate-300 text-xs md:text-base sm:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-200 transition-colors duration-300 px-2 md:px-2 sm:px-0">
        {description}
      </p>
    </div>
  );
};

export default PainPoint;
