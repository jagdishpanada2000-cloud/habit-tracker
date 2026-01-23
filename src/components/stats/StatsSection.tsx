'use client';

import { useState, useEffect, useRef } from 'react';
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
  refreshKey?: number;
  showMonthlyProgress?: boolean;
}

export const StatsSection = ({ currentMonth, refreshKey, showMonthlyProgress = true }: StatsSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState({
    percentage: 0,
    trend: 0
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; value: number }[]>([]);
  const [topHabits, setTopHabits] = useState<TopHabit[]>([]);

  const [isSectionVisible, setIsSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [loading]); // Re-run when loading is finished to ensure ref is attached


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
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Check if viewing a future month
        const isFutureMonth = currentMonth > new Date(realToday.getFullYear(), realToday.getMonth(), 1);

        if (isFutureMonth) {
          setMonthlyStats({ percentage: 0, trend: 0 });
          setWeeklyData(dayNames.map(name => ({ day: name, value: 0 })));
          setTopHabits([]);
          setLoading(false);
          return;
        }

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
        const logs = await logService.getLogs(prevMonthStart, viewDate);

        const toLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // --- 1. Monthly Progress & Trend ---
        const getMonthRate = (start: Date, end: Date, relevantLogs: HabitLog[]) => {
          const daysToProcess = end.getDate();
          let totalPossible = 0;
          let totalActual = 0;

          habits.forEach(h => {
            for (let d = 1; d <= daysToProcess; d++) {
              const checkDate = new Date(start.getFullYear(), start.getMonth(), d);
              const schedule = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];

              // Only consider days from habit creation
              const habitCreationDate = new Date(h.created_at);
              habitCreationDate.setHours(0, 0, 0, 0);
              const checkDateReset = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

              if (schedule.includes(checkDate.getDay()) && checkDateReset >= habitCreationDate) {
                totalPossible++;

                const dStr = toLocal(checkDate);
                const isLogged = relevantLogs.some(l => l.habit_id === h.id && l.completed_date === dStr);
                if (isLogged) totalActual++;
              }
            }
          });

          return totalPossible > 0 ? Math.round((totalActual / totalPossible) * 100) : 0;
        };

        // Compare current progress with SAME PORTION of last month
        const currentRate = getMonthRate(viewMonthStart, viewDate, logs);

        // For previous month, we only look up to the same day of the month
        const sameDayLastMonth = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), viewDate.getDate());
        // Clamp it to the end of the previous month just in case (e.g. Jan 31 -> Feb 28)
        const cappedLastMonthDay = sameDayLastMonth > prevMonthEnd ? prevMonthEnd : sameDayLastMonth;

        const prevRate = getMonthRate(prevMonthStart, cappedLastMonthDay, logs);
        const trend = currentRate - prevRate;

        setMonthlyStats({
          percentage: currentRate,
          trend: trend
        });

        // --- 2. Weekly Consistency ---
        const weekDataPoints = [];

        for (let i = 6; i >= 0; i--) {
          const d = new Date(viewDate);
          d.setDate(viewDate.getDate() - i);
          const dStr = toLocal(d);
          const dName = dayNames[d.getDay()];
          const dayOfWeek = d.getDay();

          let dayPossible = 0;
          let dayLogged = 0;

          habits.forEach(h => {
            const schedule = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];
            const habitCreationDate = new Date(h.created_at);
            habitCreationDate.setHours(0, 0, 0, 0);
            const dReset = new Date(d.getFullYear(), d.getMonth(), d.getDate());

            if (schedule.includes(dayOfWeek) && dReset >= habitCreationDate) {
              dayPossible++;
              if (logs.some(l => l.habit_id === h.id && l.completed_date === dStr)) {
                dayLogged++;
              }
            }
          });

          const val = dayPossible > 0 ? Math.round((dayLogged / dayPossible) * 100) : 0;

          const isToday = dStr === toLocal(realToday);

          // Check if d is in the same week as realToday
          // Using a simple check: same year and same week number (approx)
          // Better: check if it's within [Monday, Sunday] of realToday
          const sunday = new Date(realToday);
          sunday.setDate(realToday.getDate() - realToday.getDay());
          sunday.setHours(0, 0, 0, 0);
          const nextMonday = new Date(sunday);
          nextMonday.setDate(sunday.getDate() + 7);

          const isRunningWeek = d >= sunday && d < nextMonday;

          weekDataPoints.push({
            day: dName,
            value: val,
            isToday,
            isRunningWeek
          });
        }
        setWeeklyData(weekDataPoints);

        // --- 3. Top Habits ---
        // Metric: Streak ending at viewDate & 30-day percentage ending at viewDate
        const habitsStats = habits.map(h => {
          const hLogs = logs.filter(l => l.habit_id === h.id);
          const hDates = hLogs.map(l => l.completed_date);
          const schedule = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];

          // Calculate Streak ending at viewDate
          let streak = 0;
          let checkDate = new Date(viewDate);
          checkDate.setHours(0, 0, 0, 0);

          // Find the most recent scheduled day starting from today
          while (!schedule.includes(checkDate.getDay())) {
            checkDate.setDate(checkDate.getDate() - 1);
          }

          while (true) {
            const str = toLocal(checkDate);
            if (hDates.includes(str)) {
              streak++;
              // Move to previous scheduled day
              do {
                checkDate.setDate(checkDate.getDate() - 1);
              } while (!schedule.includes(checkDate.getDay()));
            } else {
              // Streak might still be alive if checkDate is Today and it's not logged yet
              const todayStr = toLocal(realToday);
              if (str === todayStr) {
                // Check if it was logged on the previous scheduled day
                do {
                  checkDate.setDate(checkDate.getDate() - 1);
                } while (!schedule.includes(checkDate.getDay()));

                const prevStr = toLocal(checkDate);
                if (hDates.includes(prevStr)) {
                  // Streak is still active from previous scheduled day
                  continue;
                } else {
                  break;
                }
              } else {
                break;
              }
            }
          }

          // Percentage for last 30 days
          const thirtyDaysAgo = new Date(viewDate);
          thirtyDaysAgo.setDate(viewDate.getDate() - 30);

          let possibleRecent = 0;
          let actualRecent = 0;
          for (let i = 0; i < 30; i++) {
            const d = new Date(viewDate);
            d.setDate(viewDate.getDate() - i);
            if (schedule.includes(d.getDay())) {
              possibleRecent++;
              const dStr = toLocal(d);
              if (hDates.includes(dStr)) actualRecent++;
            }
          }

          const pct = possibleRecent > 0 ? Math.round((actualRecent / possibleRecent) * 100) : 0;

          return {
            id: h.id,
            name: h.name,
            streak,
            percentage: pct
          };
        });

        habitsStats.sort((a, b) => b.percentage - a.percentage || b.streak - a.streak);
        setTopHabits(habitsStats.slice(0, 3));

      } catch (error: any) {
        console.error('StatsSection fetchData error:', error.message || error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth, refreshKey]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-40 bg-accent/20 rounded-xl" />
      <div className="h-40 bg-accent/20 rounded-xl" />
    </div>;
  }

  return (
    <div className="flex flex-col gap-10 animate-fade-in px-1" ref={sectionRef}>
      {/* Overview Row */}
      <div className={cn(
        "grid grid-cols-1 gap-6",
        showMonthlyProgress ? "md:grid-cols-2" : "md:grid-cols-1"
      )}>
        {showMonthlyProgress && (
          <div className="flex flex-col">
            <h3 className="mobile-section-title">Monthly Progress</h3>
            <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[240px]">
              <CircularProgress
                percentage={monthlyStats.percentage}
                size={140}
                strokeWidth={12}
                label="completed"
                sublabel="this month"
                isVisible={isSectionVisible}
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
        )}

        <div className="flex flex-col">
          <h3 className="mobile-section-title">Weekly Consistency</h3>
          <div className="glass-card p-6 flex flex-col justify-center min-h-[240px]">
            <WeeklyChart data={weeklyData} isVisible={isSectionVisible} />
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
