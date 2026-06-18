
const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MIN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarWeekHeader() {
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
