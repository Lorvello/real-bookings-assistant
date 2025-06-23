
import React from 'react';
import { MessageCircle, Calendar, Users, Zap } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 border border-emerald-500/15 rounded-3xl p-12 backdrop-blur-sm">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-700 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">3</span>
        </div>
        <h4 className="text-3xl font-bold text-white">Je assistent gaat live</h4>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
          <MessageCircle className="w-10 h-10 text-emerald-400 mb-4" />
          <h5 className="text-lg font-semibold text-white mb-3">Intelligente gesprekken</h5>
          <p className="text-sm text-slate-300 mb-4">
            Je AI assistent voert natuurlijke gesprekken en begrijpt context, vragen en wensen van klanten.
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Detecteert urgentie</li>
            <li>• Herkent servicevoorkeuren</li>
            <li>• Stelt vervolgvragen</li>
          </ul>
        </div>
        
        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
          <Calendar className="w-10 h-10 text-emerald-400 mb-4" />
          <h5 className="text-lg font-semibold text-white mb-3">Slimme planning</h5>
          <p className="text-sm text-slate-300 mb-4">
            Automatische beschikbaarheid check, dubbele boekingen voorkomen, en optimale tijdslots voorstellen.
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Real-time agenda sync</li>
            <li>• Bufferijd berekening</li>
            <li>• Reistijd compensatie</li>
          </ul>
        </div>
        
        <div className="bg-slate-800/50 border border-emerald-500/20 rounded-xl p-6">
          <Users className="w-10 h-10 text-emerald-400 mb-4" />
          <h5 className="text-lg font-semibold text-white mb-3">Persoonlijke service</h5>
          <p className="text-sm text-slate-300 mb-4">
            Elke klant krijgt gepersonaliseerde aandacht, zelfs van je AI assistent.
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Klanthistorie onthouden</li>
            <li>• Voorkeuren bewaren</li>
            <li>• Persoonlijke tone-of-voice</li>
          </ul>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Zap className="w-8 h-8 text-emerald-400" />
          <span className="text-2xl font-bold text-white">Vanaf nu draait alles automatisch</span>
        </div>
        <p className="text-xl text-slate-200 leading-relaxed max-w-3xl mx-auto mb-6">
          <strong className="text-white">24/7 beschikbaar.</strong> Je klanten kunnen altijd afspraken maken, 
          vragen stellen, of bestaande afspraken wijzigen. <strong className="text-white">Zonder dat jij er bent.</strong>
        </p>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
            <h6 className="font-semibold text-white mb-2">Wat gebeurt er automatisch?</h6>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>✓ Afspraken boeken en bevestigen</li>
              <li>✓ Herinneringen versturen</li>
              <li>✓ Wijzigingen verwerken</li>
              <li>✓ Vragen beantwoorden</li>
            </ul>
          </div>
          
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
            <h6 className="font-semibold text-white mb-2">Wanneer word je ingeschakeld?</h6>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Complexe vragen</li>
              <li>• Speciale verzoeken</li>
              <li>• Klachten of problemen</li>
              <li>• Als klant erom vraagt</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
