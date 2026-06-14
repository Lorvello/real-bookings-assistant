
interface CalendarWeekHeaderProps {
  weekDays: string[];
}

export function CalendarWeekHeader({ weekDays }: CalendarWeekHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-card rounded-xl mx-4 mt-4 p-2 border border-white/[0.06] sticky top-0 z-20">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => (
          <div key={day} className="text-center py-2 px-2">
            <div className="text-xs font-semibold text-foreground tracking-wide">{day}</div>
            <div className="text-[11px] text-subtle-foreground font-medium mt-0.5">
              <span className="md:hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
              </span>
              <span className="hidden md:inline">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
