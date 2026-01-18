import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Flame, Award, Calendar } from 'lucide-react';
import { CircularProgress } from '@/components/stats/CircularProgress';
import { habitService, Habit } from '@/services/habits';
import { logService, HabitLog } from '@/services/logs';


interface AnalyticsViewProps {
  userCreatedAt: Date | null;
}

export const AnalyticsView = ({ userCreatedAt }: AnalyticsViewProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: 'Total Habits', value: '0', icon: Target, change: null as string | null },
    { label: 'Avg Completion', value: '0%', icon: TrendingUp, change: null as string | null },
    { label: 'Current Streak', value: '0', icon: Flame, change: null as string | null },
    { label: 'Best Streak', value: '0', icon: Award, change: null as string | null },
  ]);
  const [monthlyData, setMonthlyData] = useState<{ month: string, value: number }[]>([]);
  const [dayStats, setDayStats] = useState<{
    mostActive: { day: string; value: number };
    leastActive: { day: string; value: number } | null;
  }>({
    mostActive: { day: '-', value: 0 },
    leastActive: { day: '-', value: 0 }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const habits = await habitService.getHabits();
        const today = new Date();

        // Fetch logs for last 4 months (approx 120 days) or since creation
        const rangeStart = new Date();
        rangeStart.setMonth(today.getMonth() - 3);
        rangeStart.setDate(1);

        // If account newer than 4 months, ensure we fetch from creation
        if (userCreatedAt && userCreatedAt > rangeStart) {
          rangeStart.setTime(userCreatedAt.getTime());
        }

        const logs = await logService.getLogs(rangeStart, today);

        // 1. Total Habits
        const totalHabits = habits.length;

        // 2. Avg Completion (Current Month)
        const currentMonthLogs = logs.filter(l => {
          const d = new Date(l.completed_date);
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
        const daysInCurrentMonth = today.getDate();
        const possibleCompletions = totalHabits * daysInCurrentMonth;
        const currentCompletionRate = possibleCompletions > 0
          ? Math.round((currentMonthLogs.length / possibleCompletions) * 100)
          : 0;

        // 3. Streaks (Global)
        const uniqueDates = Array.from(new Set(logs.map(l => l.completed_date))).sort();
        let currentStreak = 0;
        // Check today/yesterday for active streak
        const toLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
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

        // Best streak... (simplified for brevity, reuse existing logic or improve)
        // Simplified best streak calc using standard method
        let bestStreak = 0;
        let running = 0;
        // Convert to timestamps for accurate diff
        const sortedTimestamps = uniqueDates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
        let lastTs = 0;

        sortedTimestamps.forEach(ts => {
          if (lastTs === 0) {
            running = 1;
          } else {
            const dayDiff = Math.abs(Math.round((ts - lastTs) / (1000 * 60 * 60 * 24)));
            if (dayDiff === 1) running++;
            else running = 1;
          }
          if (running > bestStreak) bestStreak = running;
          lastTs = ts;
        });
        if (currentStreak > bestStreak) bestStreak = currentStreak;

        setStats([
          { label: 'Total Habits', value: totalHabits.toString(), icon: Target, change: null },
          { label: 'Avg Completion', value: `${currentCompletionRate}%`, icon: TrendingUp, change: null },
          { label: 'Current Streak', value: currentStreak.toString(), icon: Flame, change: null },
          { label: 'Best Streak', value: bestStreak.toString(), icon: Award, change: null },
        ]);

        // 4. Monthly Data - Filtered by Creation Date
        const last4Months = [];
        for (let i = 3; i >= 0; i--) {
          const d = new Date();
          d.setDate(1);
          d.setMonth(today.getMonth() - i);

          // Check if this month is relevant (partially or fully after creation)
          const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

          let shouldShow = true;
          if (userCreatedAt) {
            const creationStart = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), 1);
            if (monthEnd < userCreatedAt && monthStart < creationStart) {
              // Entire month is before creation month
              shouldShow = false;
            }
          }

          if (shouldShow) {
            const monthName = d.toLocaleString('default', { month: 'short' });
            const monthIdx = d.getMonth();
            const year = d.getFullYear();

            const mLogs = logs.filter(l => {
              const ld = new Date(l.completed_date);
              return ld.getMonth() === monthIdx && ld.getFullYear() === year;
            });

            // Adjust "possible" depending on creation date? 
            // If created half way through month, "daysPassed" should start from creationDay.
            let effectiveStartDay = 1;
            if (userCreatedAt && userCreatedAt.getMonth() === monthIdx && userCreatedAt.getFullYear() === year) {
              effectiveStartDay = userCreatedAt.getDate();
            }

            const daysInM = new Date(year, monthIdx + 1, 0).getDate();
            // If current month, cap at today
            let endDay = daysInM;
            if (i === 0) endDay = today.getDate();

            const activeDays = Math.max(0, endDay - effectiveStartDay + 1);

            const possible = totalHabits * activeDays;
            const value = possible > 0 ? Math.round((mLogs.length / possible) * 100) : 0;

            last4Months.push({ month: monthName, value });
          }
        }
        setMonthlyData(last4Months);

        // 5. Day Analysis
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = new Array(7).fill(0);
        logs.forEach(l => {
          const day = new Date(l.completed_date).getDay();
          dayCounts[day]++;
        });

        const mostActiveIdx = dayCounts.indexOf(Math.max(...dayCounts));

        let leastActiveData = null;

        // Check if account is older than 7 days
        let showLeastActive = true;
        if (userCreatedAt) {
          const daysSinceCreation = Math.ceil((new Date().getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreation < 7) {
            showLeastActive = false;
          }
        }

        if (showLeastActive) {
          const leastActiveIdx = dayCounts.indexOf(Math.min(...dayCounts));
          leastActiveData = { day: daysMap[leastActiveIdx], value: dayCounts[leastActiveIdx] };
        }

        setDayStats({
          mostActive: { day: daysMap[mostActiveIdx], value: dayCounts[mostActiveIdx] },
          leastActive: leastActiveData
        });

      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userCreatedAt]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">Track your long-term progress and trends</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className="glass-card p-4 animate-fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="stat-number text-2xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-sm font-medium text-muted-foreground mb-6">Monthly Overview</h3>
        <div className="flex items-end justify-around gap-4 h-48">
          {monthlyData.length === 0 ? (
            <p className="w-full text-center text-sm text-muted-foreground self-center">No monthly data yet.</p>
          ) : (
            monthlyData.map((item, idx) => {
              const isCurrentMonth = idx === monthlyData.length - 1;
              return (
                <div key={item.month} className="flex flex-col items-center gap-3 flex-1 animate-scale-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  <CircularProgress
                    percentage={item.value}
                    size={isCurrentMonth ? 100 : 80}
                    strokeWidth={isCurrentMonth ? 8 : 6}
                  />
                  <span className={`text-sm ${isCurrentMonth ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {item.month}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Day Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-accent/50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Most Active</span>
            </div>
            <p className="text-2xl font-semibold">{dayStats.mostActive.day}</p>
            <p className="text-xs text-muted-foreground">{dayStats.mostActive.value} completions</p>
          </div>

          {dayStats.leastActive ? (
            <div className="p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Least Active</span>
              </div>
              <p className="text-2xl font-semibold">{dayStats.leastActive.day}</p>
              <p className="text-xs text-muted-foreground">{dayStats.leastActive.value} completions</p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-accent/20 border border-dashed border-border/50 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground">Least active day will appear after your first week</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
