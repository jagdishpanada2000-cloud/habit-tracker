import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, Target } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { WeeklyChart } from './WeeklyChart';
import { habitService, Habit } from '@/services/habits';
import { logService, HabitLog } from '@/services/logs';
import { cn } from '@/lib/utils';

interface TopHabit {
  id: string;
  name: string;
  streak: number;
  percentage: number;
}

interface StatsSectionProps {
  currentMonth: Date;
}

export const StatsSection = ({ currentMonth }: StatsSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    percentage: 0,
    trend: 0
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; value: number }[]>([]);
  const [topHabits, setTopHabits] = useState<TopHabit[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const habits = await habitService.getHabits();
        const totalHabits = habits.length;

        if (totalHabits === 0) {
          setLoading(false);
          return;
        }

        // Determine Reference Date (The "Today" of the view)
        const realToday = new Date();
        const isCurrentCalendarMonth =
          realToday.getFullYear() === currentMonth.getFullYear() &&
          realToday.getMonth() === currentMonth.getMonth();

        // If viewing current month, stop at today. If past month, look at end of that month.
        let viewDate = isCurrentCalendarMonth
          ? realToday
          : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const viewMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        const prevMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

        // Fetch logs
        // Range: enough to cover Previous Month -> View Date
        const logs = await logService.getLogs(prevMonthStart, viewDate);

        const toLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // --- 1. Monthly Progress & Trend ---
        const getMonthRate = (start: Date, end: Date, relevantLogs: HabitLog[]) => {
          const daysPassed = end.getDate();
          let totalPossible = 0;
          let totalActual = 0;

          habits.forEach(h => {
            for (let d = 1; d <= daysPassed; d++) {
              const checkDate = new Date(start.getFullYear(), start.getMonth(), d);
              if (h.days_of_week.includes(checkDate.getDay())) {
                totalPossible++;

                const dStr = toLocal(checkDate);
                const isLogged = relevantLogs.some(l => l.habit_id === h.id && l.completed_date === dStr);
                if (isLogged) totalActual++;
              }
            }
          });

          return totalPossible > 0 ? Math.round((totalActual / totalPossible) * 100) : 0;
        };

        const currentRate = getMonthRate(viewMonthStart, viewDate, logs);
        const prevRate = getMonthRate(prevMonthStart, prevMonthEnd, logs);
        const trend = currentRate - prevRate;

        setMonthlyStats({
          percentage: currentRate,
          trend: trend
        });

        // --- 2. Weekly Consistency ---
        const weekDataPoints = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
          const d = new Date(viewDate);
          d.setDate(viewDate.getDate() - i);
          const dStr = toLocal(d);
          const dName = dayNames[d.getDay()];
          const dayOfWeek = d.getDay();

          let dayPossible = 0;
          let dayLogged = 0;

          habits.forEach(h => {
            if (h.days_of_week.includes(dayOfWeek)) {
              dayPossible++;
              if (logs.some(l => l.habit_id === h.id && l.completed_date === dStr)) {
                dayLogged++;
              }
            }
          });

          const val = dayPossible > 0 ? Math.round((dayLogged / dayPossible) * 100) : 0;
          weekDataPoints.push({ day: dName, value: val });
        }
        setWeeklyData(weekDataPoints);

        // --- 3. Top Habits ---
        // Metric: Streak ending at viewDate & 30-day percentage ending at viewDate
        const habitsStats = habits.map(h => {
          const hLogs = logs.filter(l => l.habit_id === h.id);
          const hDates = hLogs.map(l => l.completed_date).sort();

          // Calculate Streak ending at viewDate
          let streak = 0;
          let checkDate = new Date(viewDate);

          // Helper for local YYYY-MM-DD
          const toLocal = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const viewDateStr = toLocal(checkDate);
          if (hDates.includes(viewDateStr)) streak = 1;

          // Iterate back
          while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const str = toLocal(checkDate);
            if (hDates.includes(str)) {
              streak++;
            } else if (streak === 0 && str === viewDateStr) {
              // Same logic as before
              streak++;
            } else {
              break;
            }
          }

          // Percentage for viewed month (or last 30 days relative to viewDate?)
          // "Top Performing Habits" usually implies recent performance. 
          // Let's show performance *within the selected month*?
          // Or last 30 days from viewDate. Last 30 days is more robust for stats.
          const thirtyDaysAgo = new Date(viewDate);
          thirtyDaysAgo.setDate(viewDate.getDate() - 30);

          // We need to fetch more logs if we want 30 days back from viewDate?
          // Currently fetching (prevMonthStart -> viewDate), which is ~60 days. So we are good.

          const recentLogs = hLogs.filter(l => {
            const dStr = l.completed_date;
            const minStr = thirtyDaysAgo.toISOString().split('T')[0];
            const maxStr = viewDate.toISOString().split('T')[0];
            return dStr >= minStr && dStr <= maxStr;
          });

          const pct = Math.round((recentLogs.length / 30) * 100);

          return {
            id: h.id,
            name: h.name,
            streak,
            percentage: pct
          };
        });

        habitsStats.sort((a, b) => b.percentage - a.percentage || b.streak - a.streak);
        setTopHabits(habitsStats.slice(0, 3));

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-40 bg-accent/20 rounded-xl" />
      <div className="h-40 bg-accent/20 rounded-xl" />
    </div>;
  }

  return (
    <div className="flex flex-col gap-10 animate-fade-in px-1">
      {/* Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <h3 className="mobile-section-title">Monthly Progress</h3>
          <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[240px]">
            <CircularProgress
              percentage={monthlyStats.percentage}
              size={140}
              strokeWidth={12}
              label="completed"
              sublabel="this month"
            />
            <div className={cn(
              "flex items-center gap-2 mt-6 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300",
              monthlyStats.trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {monthlyStats.trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {Math.abs(monthlyStats.trend)}% {monthlyStats.trend >= 0 ? 'increase' : 'decrease'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <h3 className="mobile-section-title">Weekly Consistency</h3>
          <div className="glass-card p-6 flex flex-col justify-center min-h-[240px]">
            <WeeklyChart data={weeklyData} />
          </div>
        </div>
      </div>

      {/* Top Habits Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-0">
          <h3 className="mobile-section-title">Top Performers</h3>
          <Target className="w-4 h-4 text-muted-foreground/30 mb-4 mr-1" />
        </div>

        <div className="grid gap-3">
          {topHabits.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground/50 italic text-sm">
              Keep tracking to see your top performing habits here.
            </div>
          ) : (
            topHabits.map((habit, idx) => (
              <div
                key={habit.id}
                className="glass-card p-5 flex items-center justify-between group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ animationDelay: `${(idx + 1) * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center text-lg font-black text-muted-foreground/20">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground/90">{habit.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 text-warning text-[10px] font-bold uppercase tracking-wider">
                        <Flame className="w-3 h-3" />
                        <span>{habit.streak} DAY STREAK</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-black tracking-tighter",
                    habit.percentage >= 80 ? "text-success" :
                      habit.percentage >= 50 ? "text-primary" : "text-muted-foreground/40"
                  )}>
                    {habit.percentage}<span className="text-sm opacity-50 ml-0.5">%</span>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/40 tracking-widest mt-0.5">CONSISTENCY</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
