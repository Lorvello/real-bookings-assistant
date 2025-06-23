
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { Clock, Zap, Shield, Target } from 'lucide-react';

const ProcessHighlights = () => {
  const processHighlights = [
    {
      icon: Clock,
      title: "5-Minute Setup",
      description: "From registration to live assistant - faster than making coffee",
      color: "from-emerald-500 to-green-500"
    },
    {
      icon: Zap,
      title: "Instant Activation",
      description: "Your WhatsApp assistant goes live immediately after setup",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Shield,
      title: "Zero Technical Skills",
      description: "No coding, no complex configurations - just simple form filling",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Target,
      title: "Perfect Integration",
      description: "Seamlessly connects with your existing calendar and workflow",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
      {processHighlights.map((highlight, index) => (
        <ScrollAnimatedSection key={index} delay={index * 100}>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 group hover:-translate-y-2">
            <div className={`w-16 h-16 bg-gradient-to-br ${highlight.color} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
              <highlight.icon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{highlight.title}</h3>
            <p className="text-slate-300">{highlight.description}</p>
          </div>
        </ScrollAnimatedSection>
      ))}
    </div>
  );
};

export default ProcessHighlights;
