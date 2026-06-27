import React from 'react';
import { useTranslation } from 'react-i18next';

interface DataDisclaimerProps {
  onMethodologyClick: () => void;
}

const DataDisclaimer: React.FC<DataDisclaimerProps> = ({ onMethodologyClick }) => {
  const { t } = useTranslation('common');

  return (
    <div className="-mt-4 pb-4 text-center">
      <p className="text-slate-400 text-sm mb-2 font-medium">
        {t('dataDisclaimer.basedOn', 'Based on data from 10,000+ businesses worldwide')}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-slate-400">
        <button
          onClick={onMethodologyClick}
          className="text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium underline decoration-emerald-400/50 hover:decoration-emerald-300"
        >
          {t('dataDisclaimer.viewMethodology', 'View methodology')}
        </button>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span>{t('dataDisclaimer.updatedMonthly', 'Data updated monthly')}</span>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span>{t('dataDisclaimer.resultsVary', 'Results may vary by industry')}</span>
      </div>
    </div>
  );
};

export default DataDisclaimer;
