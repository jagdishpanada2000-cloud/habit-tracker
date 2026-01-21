interface WeeklyChartProps {
  data: {
    day: string;
    value: number;
    isToday?: boolean;
    isRunningWeek?: boolean;
  }[];
  isVisible?: boolean;
}

export const WeeklyChart = ({ data, isVisible = true }: WeeklyChartProps) => {
  const maxValue = Math.max(...data.map(d => d.value)) || 100;

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, idx) => {
        const height = isVisible ? (maxValue > 0 ? (item.value / maxValue) * 100 : 0) : 0;
        const isToday = item.isToday;
        const isRunningWeek = item.isRunningWeek;

        return (
          <div key={`${item.day}-${idx}`} className="flex-1 flex flex-col items-center gap-2">

            <div className="w-full relative h-24 flex items-end">
              <div
                className={`w-full rounded-t-lg transition-all duration-1000 ease-in-out ${isToday
                  ? 'bg-gradient-to-t from-primary to-primary/60 shadow-[0_0_15px_hsl(var(--primary)/0.4)] border-t border-white/20'
                  : isRunningWeek
                    ? 'bg-primary/20 hover:bg-primary/30 border-t border-primary/20 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                    : 'bg-white/5 hover:bg-white/10'
                  }`}

                style={{
                  height: `${height}%`,
                  transitionDelay: isVisible ? `${idx * 100}ms` : '0ms',
                }}
              />
              {isToday && isVisible && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                  NOW
                </div>
              )}
            </div>
            <span className={`text-[10px] font-bold tracking-tighter ${isToday ? 'text-primary' : isRunningWeek ? 'text-muted-foreground/60' : 'text-muted-foreground/20'}`}>
              {item.day.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
};
