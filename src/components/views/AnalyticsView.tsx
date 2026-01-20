'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Target, Flame, Award, Calendar, BarChart2, Activity, Layers } from 'lucide-react';
import { CircularProgress } from '@/components/stats/CircularProgress';
import { cn } from '@/lib/utils';
import { habitService, Habit } from '@/services/habits';
import { logService } from '@/services/logs';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';

interface AnalyticsViewProps {
  userCreatedAt: Date | null;
}

export const AnalyticsView = ({ userCreatedAt }: AnalyticsViewProps) => {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState([
    { label: 'Active Habits', value: '0', icon: Target },
    { label: 'Completion', value: '0%', icon: TrendingUp },
    { label: 'Streak', value: '0', icon: Flame },
    { label: 'Best', value: '0', icon: Award },
  ]);
  const [monthlyData, setMonthlyData] = useState<{ month: string, value: number }[]>([]);
  const [weeklyOverview, setWeeklyOverview] = useState<{ week: string, value: number }[]>([]);
  const [dailyTrendData, setDailyTrendData] = useState<{ date: string; completions: number }[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [dayStats, setDayStats] = useState<{
    mostActive: { day: string; value: number };
  }>({
    mostActive: { day: '-', value: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const habitsData = await habitService.getHabits();
        setHabits(habitsData);
        const today = new Date();

        const rangeStart = new Date();
        rangeStart.setMonth(today.getMonth() - 4);
        rangeStart.setDate(1);

        if (userCreatedAt && userCreatedAt > rangeStart) {
          rangeStart.setTime(userCreatedAt.getTime());
        }

        const logs = await logService.getLogs(rangeStart, today);
        const totalHabits = habitsData.length;

        const toLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // Avg Completion (Current Month)
        const currentMonthLogs = logs.filter(l => {
          const d = new Date(l.completed_date);
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
        const daysInCurrentMonth = today.getDate();
        const possibleCompletions = totalHabits * daysInCurrentMonth;
        const currentCompletionRate = possibleCompletions > 0
          ? Math.round((currentMonthLogs.length / possibleCompletions) * 100)
          : 0;

        // Streaks
        const uniqueDates = Array.from(new Set(logs.map(l => l.completed_date))).sort();
        let currentStreak = 0;
        const todayStr = toLocal(new Date());
        if (uniqueDates.includes(todayStr)) currentStreak = 1;

        let tempDate = new Date();
        tempDate.setDate(tempDate.getDate() - 1);
        while (true) {
          const dateStr = toLocal(tempDate);
          if (uniqueDates.includes(dateStr)) {
            currentStreak++;
            tempDate.setDate(tempDate.getDate() - 1);
          } else {
            break;
          }
        }

        let bestStreak = 0;
        let running = 0;
        const sortedTimestamps = uniqueDates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
        let lastTs = 0;

        sortedTimestamps.forEach(ts => {
          if (lastTs === 0) running = 1;
          else {
            const dayDiff = Math.abs(Math.round((ts - lastTs) / (1000 * 60 * 60 * 24)));
            if (dayDiff === 1) running++;
            else running = 1;
          }
          if (running > bestStreak) bestStreak = running;
          lastTs = ts;
        });
        if (currentStreak > bestStreak) bestStreak = currentStreak;

        setStats([
          { label: 'Active Habits', value: totalHabits.toString(), icon: Target },
          { label: 'Completion', value: `${currentCompletionRate}%`, icon: TrendingUp },
          { label: 'Streak', value: currentStreak.toString(), icon: Flame },
          { label: 'Best', value: bestStreak.toString(), icon: Award },
        ]);

        // Monthly Progress
        const last4Months = [];
        for (let i = 3; i >= 0; i--) {
          const d = new Date();
          d.setDate(1);
          d.setMonth(today.getMonth() - i);
          const monthIdx = d.getMonth();
          const year = d.getFullYear();
          const monthName = d.toLocaleString('default', { month: 'short' });

          const mLogs = logs.filter(l => {
            const ld = new Date(l.completed_date);
            return ld.getMonth() === monthIdx && ld.getFullYear() === year;
          });

          let effectiveStartDay = 1;
          if (userCreatedAt && userCreatedAt.getMonth() === monthIdx && userCreatedAt.getFullYear() === year) {
            effectiveStartDay = userCreatedAt.getDate();
          }

          const daysInM = new Date(year, monthIdx + 1, 0).getDate();
          let endDay = i === 0 ? today.getDate() : daysInM;
          const activeDays = Math.max(0, endDay - effectiveStartDay + 1);

          const possible = totalHabits * activeDays;
          const value = possible > 0 ? Math.round((mLogs.length / possible) * 100) : 0;
          last4Months.push({ month: monthName, value });
        }
        setMonthlyData(last4Months);

        // Weekly Overview (Calendar Weeks: Mon - Sun)
        const last4Weeks = [];
        const dayOfWeek = today.getDay(); // 0(Sun) to 6(Sat)
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        for (let i = 3; i >= 0; i--) {
          const mondayOfTargetWeek = new Date(today);
          mondayOfTargetWeek.setDate(today.getDate() - daysSinceMonday - (i * 7));
          mondayOfTargetWeek.setHours(0, 0, 0, 0);

          const sundayOfTargetWeek = new Date(mondayOfTargetWeek);
          sundayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + 6);
          sundayOfTargetWeek.setHours(23, 59, 59, 999);

          const wLogs = logs.filter(l => {
            const ld = new Date(l.completed_date);
            return ld >= mondayOfTargetWeek && ld <= sundayOfTargetWeek;
          });

          let totalPossible = 0;
          habitsData.forEach(h => {
            const schedule = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];
            // If it's a past week, count all scheduled days in that week
            // If it's the current week, only count scheduled days up to today
            const endDayInWeek = i === 0 ? daysSinceMonday : 6;

            for (let d = 0; d <= endDayInWeek; d++) {
              const checkDate = new Date(mondayOfTargetWeek);
              checkDate.setDate(mondayOfTargetWeek.getDate() + d);
              if (schedule.includes(checkDate.getDay())) {
                totalPossible++;
              }
            }
          });

          const value = totalPossible > 0 ? Math.round((wLogs.length / totalPossible) * 100) : 0;
          last4Weeks.push({
            week: i === 0 ? 'Now' : `W-${i}`,
            value,
            isCurrent: i === 0
          });
        }
        setWeeklyOverview(last4Weeks.reverse());

        // DAILY Aggregate (30 Days)
        const dailyAgg = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dStr = toLocal(d);
          const completions = logs.filter(l => l.completed_date === dStr).length;
          dailyAgg.push({ date: d.toLocaleDateString('en-US', { day: 'numeric' }), completions });
        }
        setDailyTrendData(dailyAgg);

        // Comparison Data (30 Days, Rolling)
        const compData = [];
        for (let i = 29; i >= 0; i--) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() - i);
          const entry: any = { date: targetDate.toLocaleDateString('en-US', { day: 'numeric' }) };

          habitsData.forEach(h => {
            let completionsInWindow = 0;
            let possibleInWindow = 0;
            const schedule = h.days_of_week || [0, 1, 2, 3, 4, 5, 6];

            for (let j = 0; j < 7; j++) {
              const checkDate = new Date(targetDate);
              checkDate.setDate(targetDate.getDate() - j);
              const checkStr = toLocal(checkDate);
              if (schedule.includes(checkDate.getDay())) {
                possibleInWindow++;
                if (logs.some(l => l.habit_id === h.id && l.completed_date === checkStr)) {
                  completionsInWindow++;
                }
              }
            }
            entry[h.name] = possibleInWindow > 0 ? Math.round((completionsInWindow / possibleInWindow) * 100) : 0;
          });
          compData.push(entry);
        }
        setComparisonData(compData);

        // Day stats
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = new Array(7).fill(0);
        logs.forEach(l => dayCounts[new Date(l.completed_date).getDay()]++);
        const mostActiveIdx = dayCounts.indexOf(Math.max(...dayCounts));
        setDayStats({ mostActive: { day: daysMap[mostActiveIdx], value: dayCounts[mostActiveIdx] } });

      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userCreatedAt]);

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Activity className="w-10 h-10 animate-pulse opacity-20" />
        <p className="text-sm font-medium opacity-40 uppercase tracking-widest">Crunching data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      <header className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground opacity-60">Insights & Trends</p>
        </div>
        <Activity className="w-5 h-5 text-primary opacity-40" />
      </header>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card p-4 flex flex-col gap-1 border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <stat.icon className="w-3 h-3 text-primary/40" />
            </div>
            <span className="text-xl font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Primary Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Progress */}
        <div className="glass-card p-6 flex flex-col gap-6">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Weekly Consistency</h3>
          <div className="flex items-center justify-around gap-2 py-2">
            {weeklyOverview.map((item: any, idx) => {
              const isCurrent = item.isCurrent;
              return (
                <div key={idx} className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "relative transition-transform duration-500",
                    isCurrent && "scale-110"
                  )}>
                    <CircularProgress
                      percentage={item.value}
                      size={isCurrent ? 72 : 52}
                      strokeWidth={isCurrent ? 8 : 4}
                      className={isCurrent ? "drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]" : ""}
                    />
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-tight transition-colors",
                    isCurrent ? "text-primary uppercase" : "text-muted-foreground/30"
                  )}>
                    {item.week}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aggregate Output */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Daily Output</h3>
            <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground/60">30D</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '10px'
                  }}
                />
                <Area type="monotone" dataKey="completions" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#glow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison (Detailed) */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary/60" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Habit Comparison</h3>
          </div>
          <p className="text-[9px] text-muted-foreground/30 italic">7D Rolling Avg</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, opacity: 0.3 }} minTickGap={20} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '10px',
                  backdropFilter: 'blur(8px)'
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 10, opacity: 0.6 }} />
              {habits.map((h, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={h.name}
                  stroke={h.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 flex flex-col gap-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Monthly History</h3>
          <div className="flex items-end justify-between gap-2 h-24 px-2">
            {monthlyData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-white/5 rounded-sm relative h-16 overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-700"
                    style={{ height: `${item.value}%` }}
                  />
                </div>
                <span className="text-[9px] font-medium opacity-40">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between border-primary/10">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Peak Day</h3>
            <span className="text-2xl font-semibold">{dayStats.mostActive.day}</span>
            <p className="text-[10px] text-muted-foreground/40">{dayStats.mostActive.value} completions</p>
          </div>
          <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
