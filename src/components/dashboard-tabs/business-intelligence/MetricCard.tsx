
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  iconBgFrom: string;
  iconBgTo: string;
  iconColor: string;
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
  gradientFrom,
  gradientTo,
  borderColor,
  iconBgFrom,
  iconBgTo,
  iconColor,
  delay,
  change
}: MetricCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="relative group"
    >
      {/* Background glow effect */}
      <div className={`absolute -inset-2 bg-gradient-to-br ${gradientFrom} ${gradientTo} blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300`}></div>
      
      {/* Card container with fixed height */}
      <div className={`relative bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border ${borderColor} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] h-40 flex flex-col justify-between p-6`}>
        
        {/* Header with title and icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">{title}</p>
          </div>
          <div className={`w-12 h-12 bg-gradient-to-br ${iconBgFrom} ${iconBgTo} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className={`h-6 w-6 text-${iconColor}-400`} />
          </div>
        </div>

        {/* Main value - large and prominent */}
        <div className="flex-1 flex items-center">
          <p className={`text-4xl font-black text-slate-100 leading-none tabular-nums`}>
            {value}
          </p>
        </div>

        {/* Footer with subtitle or change indicator */}
        <div className="flex items-center justify-between mt-auto">
          {change ? (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                change.isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <change.icon className="h-3 w-3" />
                <span className="text-xs font-bold">
                  {change.isPositive ? '+' : ''}{Math.abs(change.value).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-medium">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
