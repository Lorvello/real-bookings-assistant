
import React from 'react';
import { MessageCircle, Calendar, Users, Zap, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative">
      {/* Background glow effects */}
      <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 rounded-3xl blur-xl"></div>
      
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <div className="absolute -inset-2 bg-purple-400/20 rounded-2xl blur-lg animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Je assistent gaat live</h3>
              <div className="flex items-center gap-2 text-purple-400">
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">AI-powered</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
              <p className="text-xl text-slate-300 leading-relaxed mb-8">
                Klaar voor actie. Vanaf nu kunnen je klanten via WhatsApp:
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Afspraken boeken (op basis van je kalender)',
                  'Afspraken verzetten of annuleren',
                  'Direct persoonlijke hulp krijgen, zonder wachttijd'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 group">
                    <div className="relative">
                      <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    </div>
                    <span className="text-slate-300 group-hover:text-white transition-colors duration-200">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-400"></div>
                <div className="flex items-center gap-4 mb-3">
                  <Zap className="w-6 h-6 text-purple-400" />
                  <span className="text-purple-400 font-bold text-lg">Volledig geautomatiseerd</span>
                </div>
                <p className="text-slate-300">
                  Je hoeft zelf niets te doen. Je slimme assistent regelt alles — 24/7, 
                  volledig automatisch, in jouw stijl.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
          
          <div className="relative space-y-6">
            {/* Feature cards */}
            <div className="grid gap-4">
              {[
                {
                  icon: MessageCircle,
                  title: 'Intelligente gesprekken',
                  description: 'Natuurlijke gesprekken en begrijpt context van klanten.',
                  gradient: 'from-emerald-400 to-green-400',
                  bgGradient: 'from-emerald-500/20 to-green-500/20',
                  borderColor: 'emerald-500/40'
                },
                {
                  icon: Calendar,
                  title: 'Slimme planning',
                  description: 'Automatische beschikbaarheid check en optimale tijdslots.',
                  gradient: 'from-blue-400 to-cyan-400',
                  bgGradient: 'from-blue-500/20 to-cyan-500/20',
                  borderColor: 'blue-500/40'
                },
                {
                  icon: Users,
                  title: 'Persoonlijke service',
                  description: 'Gepersonaliseerde aandacht voor elke klant.',
                  gradient: 'from-purple-400 to-pink-400',
                  bgGradient: 'from-purple-500/20 to-pink-500/20',
                  borderColor: 'purple-500/40'
                }
              ].map((card, index) => {
                const Icon = card.icon;
                
                return (
                  <div key={index} className="relative group">
                    <div className={`absolute -inset-1 bg-gradient-to-r ${card.gradient} rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-300`}></div>
                    <div className={`relative bg-gradient-to-br ${card.bgGradient} border border-${card.borderColor} rounded-2xl p-6 backdrop-blur-sm group-hover:border-opacity-60 transition-all duration-300`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <Icon className={`w-6 h-6 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`} />
                          <div className="absolute inset-0 blur-sm opacity-50">
                            <Icon className={`w-6 h-6 text-${card.gradient.split('-')[1]}-400`} />
                          </div>
                        </div>
                        <h5 className="font-bold text-white">{card.title}</h5>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Status indicator */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/40 rounded-3xl p-8 backdrop-blur-xl text-center shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-t-3xl"></div>
                
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                  <div className="absolute -inset-2 bg-emerald-400/20 rounded-2xl blur-lg animate-pulse"></div>
                </div>
                
                <h4 className="font-bold text-white mb-3 text-xl flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  24/7 Actief
                </h4>
                <p className="text-slate-300">Live en actief sinds vandaag</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
