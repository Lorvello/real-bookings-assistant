
import { LucideIcon } from "lucide-react";

interface PainPointProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const PainPoint = ({ icon: Icon, title, description, color }: PainPointProps) => {
  return (
    <div className="group relative">
      {/* Background with gradient and glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/30 group-hover:border-slate-600/50 transition-all duration-500"></div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative p-8 lg:p-10">
        {/* Icon container with improved styling */}
        <div className="relative mb-8">
          <div className={`w-16 h-16 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-8 h-8 text-white" strokeWidth={2} />
          </div>
          
          {/* Subtle icon glow */}
          <div className={`absolute inset-0 w-16 h-16 bg-gradient-to-br ${color} rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300`}></div>
        </div>
        
        {/* Title with better typography */}
        <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 leading-tight">
          {title}
        </h3>
        
        {/* Description with improved spacing */}
        <p className="text-slate-300 text-lg leading-relaxed">
          {description}
        </p>
        
        {/* Subtle bottom accent */}
        <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent"></div>
      </div>
    </div>
  );
};

export default PainPoint;
