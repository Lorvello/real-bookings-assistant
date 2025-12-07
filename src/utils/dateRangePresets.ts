
export type DateRangePreset = 'upcoming' | 'next30days' | 'last7days' | 'last30days' | 'last3months' | 'lastyear' | 'alltime' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
  label: string;
}

export const getPresetRange = (preset: DateRangePreset): DateRange => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (preset) {
    case 'upcoming':
      return {
        startDate: todayStart,
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        preset,
        label: 'Upcoming'
      };
    case 'next30days':
      return {
        startDate: todayStart,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        preset,
        label: 'Next 30 days'
      };
    case 'last7days':
      return {
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: todayEnd,
        preset,
        label: 'Last 7 days'
      };
    case 'last30days':
      return {
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: todayEnd,
        preset,
        label: 'Last 30 days'
      };
    case 'last3months':
      return {
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: todayEnd,
        preset,
        label: 'Last 3 months'
      };
    case 'lastyear':
      return {
        startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        endDate: todayEnd,
        preset,
        label: 'Last year'
      };
    case 'alltime':
      return {
        startDate: new Date(2020, 0, 1),
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        preset,
        label: 'All time'
      };
    default:
      return {
        startDate: todayStart,
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        preset: 'upcoming',
        label: 'Upcoming'
      };
  }
};

export const presetOptions = [
  { preset: 'upcoming' as DateRangePreset, label: 'Upcoming' },
  { preset: 'next30days' as DateRangePreset, label: 'Next 30 days' },
  { preset: 'last7days' as DateRangePreset, label: 'Last 7 days' },
  { preset: 'last30days' as DateRangePreset, label: 'Last 30 days' },
  { preset: 'last3months' as DateRangePreset, label: 'Last 3 months' },
  { preset: 'lastyear' as DateRangePreset, label: 'Last year' },
  { preset: 'alltime' as DateRangePreset, label: 'All time' },
];
