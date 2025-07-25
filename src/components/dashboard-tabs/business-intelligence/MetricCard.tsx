
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string | React.ReactNode;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  variant: 'blue' | 'green' | 'orange' | 'purple';
  delay: number;
  change?: {
    value: number;
    isPositive: boolean;
    icon: LucideIcon;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  delay,
  change
}: MetricCardProps) {
  const colorSchemes = {
    blue: {
      gradientFrom: 'from-blue-500/40',
      gradientTo: 'to-cyan-500/30',
      borderColor: 'border-blue-500/30',
      iconBgFrom: 'from-blue-500/20',
      iconBgTo: 'to-cyan-500/20',
      iconColor: 'text-blue-400',
      glowColor: 'shadow-blue-500/25'
    },
    green: {
      gradientFrom: 'from-emerald-500/40',
      gradientTo: 'to-teal-500/30',
      borderColor: 'border-emerald-500/30',
      iconBgFrom: 'from-emerald-500/20',
      iconBgTo: 'to-teal-500/20',
      iconColor: 'text-emerald-400',
      glowColor: 'shadow-emerald-500/25'
    },
    orange: {
      gradientFrom: 'from-orange-500/40',
      gradientTo: 'to-amber-500/30',
      borderColor: 'border-orange-500/30',
      iconBgFrom: 'from-orange-500/20',
      iconBgTo: 'to-amber-500/20',
      iconColor: 'text-orange-400',
      glowColor: 'shadow-orange-500/25'
    },
    purple: {
      gradientFrom: 'from-purple-500/40',
      gradientTo: 'to-violet-500/30',
      borderColor: 'border-purple-500/30',
      iconBgFrom: 'from-purple-500/20',
      iconBgTo: 'to-violet-500/20',
      iconColor: 'text-purple-400',
      glowColor: 'shadow-purple-500/25'
    }
  };

  const colors = colorSchemes[variant];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="relative group"
    >
      {/* Background glow effect - Mobile optimized */}
      <div className={`absolute -inset-1 md:-inset-2 bg-gradient-to-br ${colors.gradientFrom} ${colors.gradientTo} blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
      
      {/* Card container with mobile-first responsive height */}
      <div className={`relative bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border ${colors.borderColor} rounded-xl md:rounded-2xl shadow-xl ${colors.glowColor} hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] h-28 md:h-44 flex flex-col justify-between p-3 md:p-6`}>
        
        {/* Header with title and icon - Mobile optimized */}
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex-1">
            <div className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">{title}</div>
          </div>
          <div className={`w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br ${colors.iconBgFrom} ${colors.iconBgTo} rounded-lg md:rounded-xl flex items-center justify-center shadow-lg min-w-[32px] min-h-[32px] md:min-w-[48px] md:min-h-[48px]`}>
            <Icon className={`h-4 w-4 md:h-6 md:w-6 ${colors.iconColor}`} />
          </div>
        </div>

        {/* Main value - Mobile optimized text scaling */}
        <div className="flex-1 flex items-center">
          <p className={`text-2xl md:text-4xl font-black text-slate-100 leading-none tabular-nums`}>
            {value}
          </p>
        </div>

        {/* Footer with subtitle or change indicator - Mobile optimized */}
        <div className="flex items-center justify-between mt-auto">
          {change ? (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg min-h-[44px] md:min-h-auto ${
                change.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <change.icon className="h-3 w-3" />
                <span className="text-xs md:text-xs font-bold">
                  {change.isPositive ? '+' : ''}{Math.abs(change.value).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs md:text-sm text-slate-400 font-medium truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
