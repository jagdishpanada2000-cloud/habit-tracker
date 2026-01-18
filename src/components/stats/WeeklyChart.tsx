interface WeeklyChartProps {
  data: { day: string; value: number }[];
}

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const maxValue = Math.max(...data.map(d => d.value)) || 100;

  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((item, idx) => {
        const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        // Assuming data is Mon-Sun
        // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
        // Index mapping: 0=Mon (1), 1=Tue (2)... 5=Sat (6), 6=Sun (0)
        const today = new Date().getDay();
        // Convert JS Sunday (0) to 7 for easier comparison with 1-based Mon-Sun
        const jsDay = today === 0 ? 7 : today;
        const isToday = (idx + 1) === jsDay;

        return (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full relative h-24 flex items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ease-out ${isToday ? 'bg-primary glow-primary' : 'bg-accent'
                  }`}
                style={{
                  height: `${height}%`,
                  animationDelay: `${idx * 50}ms`,
                }}
              />
            </div>
            <span className={`text-xs ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              {item.day}
            </span>
          </div>
        );
      })}
    </div>
  );
};
