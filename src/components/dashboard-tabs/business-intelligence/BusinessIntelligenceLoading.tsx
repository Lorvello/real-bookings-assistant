
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
            className="relative"
          >
            <div className="relative bg-card border border-white/[0.08] p-8"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}>
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-muted/40 rounded-full w-1/2"
                     style={{ borderRadius: '1rem 2rem 1rem 2rem' }}></div>
                <div className="h-10 bg-muted/40 rounded-full w-3/4"
                     style={{ borderRadius: '1.5rem 3rem 1.5rem 3rem' }}></div>
                <div className="h-3 bg-muted/40 rounded-full w-1/3"
                     style={{ borderRadius: '0.5rem 1.5rem 0.5rem 1.5rem' }}></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
