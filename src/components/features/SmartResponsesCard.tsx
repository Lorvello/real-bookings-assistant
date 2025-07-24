import { Check, X } from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';

export const SmartResponsesCard = () => {
  const { t } = useTranslation();
  
  // Hardcoded comparisons for now since translation system has limitations
  const comparisons = [
    { normal: t('featureCards.smartResponses.comparisons.0.normal') || '"We zijn gesloten"', smart: t('featureCards.smartResponses.comparisons.0.smart') || '"We zijn nu gesloten, maar morgen open om 9:00. Zal ik een afspraak inplannen?"' },
    { normal: t('featureCards.smartResponses.comparisons.1.normal') || '"Kies een service"', smart: t('featureCards.smartResponses.comparisons.1.smart') || '"Op basis van je laatste bezoek (knippen), stel ik voor: knippen + wassen voor €40?"' },
    { normal: t('featureCards.smartResponses.comparisons.2.normal') || '"Kies een tijd"', smart: t('featureCards.smartResponses.comparisons.2.smart') || '"Je kwam vorige keer op donderdag 15:00. Zelfde tijd deze week?"' },
    { normal: t('featureCards.smartResponses.comparisons.3.normal') || '"Betalen na afspraak"', smart: t('featureCards.smartResponses.comparisons.3.smart') || '"Knippen €25, betaling contant of pin. Wil je direct bevestigen?"' },
    { normal: t('featureCards.smartResponses.comparisons.4.normal') || '"Annuleren niet mogelijk"', smart: t('featureCards.smartResponses.comparisons.4.smart') || '"Natuurlijk, welke afspraak wil je annuleren? Zal ik direct een nieuwe tijd voorstellen?"' },
    { normal: t('featureCards.smartResponses.comparisons.5.normal') || '"Maandag tot vrijdag 9-17u"', smart: t('featureCards.smartResponses.comparisons.5.smart') || '"We zijn vandaag open tot 17:00. Kan ik je nog inplannen of liever morgen?"' },
    { normal: t('featureCards.smartResponses.comparisons.6.normal') || '"Vul je gegevens in"', smart: t('featureCards.smartResponses.comparisons.6.smart') || '"Hallo Sarah! Zelfde contactgegevens als vorige keer gebruiken?"' }
  ];
  
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Smart AI Comparison Interface - placed directly on card background */}
      <div className="absolute top-2 left-2 right-2 bottom-2 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-[10px] font-semibold">{t('featureCards.smartResponses.normal')}</span>
            <div className="w-4 h-4 bg-emerald-500/30 rounded-full flex items-center justify-center">
              <span className="text-[8px] text-emerald-400">vs</span>
            </div>
            <span className="text-emerald-400 text-[10px] font-semibold">{t('featureCards.smartResponses.smartAi')}</span>
          </div>
        </div>
        
        {/* Comparison Grid */}
        <div className="flex-1 space-y-2">
          {/* Comparison rows */}
          {comparisons.map((comparison, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-2 cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-red-600/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/20 transform">
                <div className="flex items-center gap-1 mb-1">
                  <X className="w-2 h-2 text-red-400" />
                  <span className="text-red-400 text-[7px] font-medium">{t('featureCards.smartResponses.normal')}</span>
                </div>
                <div className="bg-red-500/10 rounded px-2 py-1">
                  <p className="text-red-300 text-[7px] leading-tight">{comparison.normal}</p>
                </div>
              </div>
              
              <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-lg p-2 cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:bg-emerald-600/30 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transform">
                <div className="flex items-center gap-1 mb-1">
                  <Check className="w-2 h-2 text-emerald-400" />
                  <span className="text-emerald-400 text-[7px] font-medium">{t('featureCards.smartResponses.smartAi')}</span>
                </div>
                <div className="bg-emerald-500/10 rounded px-2 py-1">
                  <p className="text-emerald-300 text-[7px] leading-tight">{comparison.smart}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Background accent elements */}
      <div className="absolute top-3 right-3 w-3 h-3 bg-emerald-500/20 rounded-full" />
      <div className="absolute bottom-3 left-3 w-2 h-2 bg-emerald-400/20 rounded-full" />
    </div>
  );
};