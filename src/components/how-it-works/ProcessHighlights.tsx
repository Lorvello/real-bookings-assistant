
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { ArrowRight, CheckCircle } from 'lucide-react';

const ProcessHighlights = () => {
  return (
    <ScrollAnimatedSection>
      <div className="max-w-4xl mx-auto mt-20">
        {/* Main Process Flow */}
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">3</span>
              </div>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
              3 stappen. 5 minuten. Klaar.
            </h3>
          </div>

          {/* Process Steps */}
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h4 className="text-xl font-bold text-white">Vul je gegevens in</h4>
              <p className="text-slate-300 leading-relaxed">
                Bedrijfsnaam, website, email. Koppel je agenda. 
                <strong className="text-white"> Meer niet.</strong>
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h4 className="text-xl font-bold text-white">Kies je WhatsApp nummer</h4>
              <p className="text-slate-300 leading-relaxed">
                Wij regelen een nummer voor je, of gebruik je eigen nummer. 
                <strong className="text-white"> Jij kiest.</strong>
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h4 className="text-xl font-bold text-white">Je assistent is live</h4>
              <p className="text-slate-300 leading-relaxed">
                Klanten kunnen nu 24/7 afspraken boeken via WhatsApp. 
                <strong className="text-white"> Automatisch.</strong>
              </p>
            </div>
          </div>

          {/* Result Statement */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">Resultaat:</span>
            </div>
            <p className="text-xl text-emerald-100 leading-relaxed max-w-3xl mx-auto">
              Vanaf nu hoef jij <strong className="text-white">nooit meer</strong> tijd te verspillen aan het heen-en-weer appen over afspraken. 
              Je assistent doet het werk, jij focust op wat echt belangrijk is: <strong className="text-white">je klanten helpen.</strong>
            </p>
          </div>

          {/* Proof Points */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="flex items-center gap-4 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Geen technische kennis nodig</span>
            </div>
            <div className="flex items-center gap-4 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Direct actief na setup</span>
            </div>
            <div className="flex items-center gap-4 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Werkt met je bestaande agenda</span>
            </div>
            <div className="flex items-center gap-4 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">24/7 beschikbaar voor klanten</span>
            </div>
          </div>
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
