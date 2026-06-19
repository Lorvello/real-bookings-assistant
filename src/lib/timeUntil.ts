// Human-readable "time until" a future instant, with DAY rollover so a far-away appointment
// never shows a giant raw hour count (the "132 uur" dashboard bug — 132h is meaningless to a
// person; "in 5d 12h" is not). Returns e.g. "in 5d 12h", "in 2h 30m", "in 45m", "in < 1m".
// Shared by the Overview next-appointment hero and the Live Operations next-appointment metric.
export function formatTimeUntil(startISO: string, now: Date = new Date()): string {
  const diffMs = new Date(startISO).getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return '';
  if (diffMs <= 0) return 'In progress';
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days >= 1) return `in ${days}d ${hours}h`;
  if (hours >= 1) return `in ${hours}h ${minutes}m`;
  if (minutes >= 1) return `in ${minutes}m`;
  return 'in < 1m';
}
