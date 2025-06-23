
interface CalendarWeekHeaderProps {
  weekDays: string[];
}

export function CalendarWeekHeader({ weekDays }: CalendarWeekHeaderProps) {
  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-xl rounded-2xl mx-4 mt-4 p-3 shadow-lg shadow-black/5 border border-border/40 sticky top-0 z-20">
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => (
          <div key={day} className="text-center py-3 px-2 rounded-xl bg-gradient-to-b from-muted/50 to-muted/30 border border-border/30">
            <div className="text-sm font-bold text-foreground tracking-wide">{day}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">
              {['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'][index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
