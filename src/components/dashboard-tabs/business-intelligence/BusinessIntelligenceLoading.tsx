
import React from 'react';
import { motion } from 'framer-motion';

export function BusinessIntelligenceLoading() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative group"
          >
            <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent blur-2xl"
                 style={{
                   borderRadius: '40% 60% 50% 70% / 60% 40% 70% 50%'
                 }}></div>
            <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-primary/20 shadow-2xl p-8"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}>
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full w-1/2"
                     style={{ borderRadius: '1rem 2rem 1rem 2rem' }}></div>
                <div className="h-10 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full w-3/4"
                     style={{ borderRadius: '1.5rem 3rem 1.5rem 3rem' }}></div>
                <div className="h-3 bg-gradient-to-r from-primary/15 to-primary/5 rounded-full w-1/3"
                     style={{ borderRadius: '0.5rem 1.5rem 0.5rem 1.5rem' }}></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
