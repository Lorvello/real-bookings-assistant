
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
      <div className={`absolute -inset-3 bg-gradient-to-br ${gradientFrom} ${gradientTo} blur-2xl group-hover:blur-3xl transition-all duration-700`}
           style={{
             borderRadius: '40% 60% 50% 80% / 60% 40% 70% 30%'
           }}></div>
      <div className={`relative bg-gradient-to-br from-card/95 via-card/85 to-card/70 backdrop-blur-2xl border ${borderColor} shadow-2xl hover:shadow-${iconColor}-500/20 transition-all duration-500 group-hover:scale-105 p-8`}
           style={{
             borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
           }}>
        <div className={`absolute inset-0 bg-gradient-to-br from-${iconColor}-50/10 to-transparent`}
             style={{
               borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
             }}></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-4">
            <p className={`text-sm font-bold tracking-widest text-${iconColor}-600/80 uppercase`}>{title}</p>
            <p className={`text-4xl font-black bg-gradient-to-r ${iconBgFrom} ${iconBgTo} bg-clip-text text-transparent tabular-nums`}>
              {value}
            </p>
            {change ? (
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: change.isPositive ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                  className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg"
                  style={{ borderRadius: '50% 70% 50% 70%' }}
                >
                  <change.icon className="h-3 w-3 text-white" />
                </motion.div>
                <span className={`text-sm font-bold ${change.isPositive ? 'text-green-500' : 'text-red-400'} drop-shadow-lg`}>
                  {Math.abs(change.value).toFixed(1)}%
                </span>
              </div>
            ) : (
              <p className={`text-sm text-${iconColor}-500/80 font-semibold`}>{subtitle}</p>
            )}
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br ${iconBgFrom} ${iconBgTo} backdrop-blur-xl border border-${iconColor}-300/20 shadow-xl flex items-center justify-center`}
               style={{
                 borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
               }}>
            <Icon className={`h-8 w-8 text-${iconColor}-500 drop-shadow-lg`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
