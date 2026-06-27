
import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { dateFnsLocale } from '@/lib/dateLocale';

export function CalendarWeekHeader() {
  const { i18n } = useTranslation('appPages');
  const locale = dateFnsLocale(i18n.language);

  // Monday-first week, weekday labels derived from the active date-fns locale so
  // they follow the EN<->NL toggle. EN stays 'Mon'..'Sun' / 'M','T','W','T','F','S','S';
  // NL becomes 'ma'..'zo' / 'M','D','W','D','V','Z','Z'.
  const { SHORT, MIN } = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    return {
      SHORT: days.map((d) => format(d, 'EEE', { locale })),
      MIN: days.map((d) => format(d, 'EEEEE', { locale })),
    };
  }, [locale]);

  return (
    <div className="sticky top-0 z-20 flex-shrink-0 border-b border-white/[0.06] bg-card/95 px-1 pb-2 pt-1 backdrop-blur-sm sm:px-2">
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {SHORT.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground"
          >
            <span className="sm:hidden">{MIN[index]}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
