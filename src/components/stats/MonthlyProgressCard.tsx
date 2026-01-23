'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { habitService } from '@/services/habits';
import { logService, HabitLog } from '@/services/logs';
import { cn } from '@/lib/utils';

interface MonthlyProgressCardProps {
    currentMonth: Date;
    refreshKey?: number;
    isVisible?: boolean;
}

export const MonthlyProgressCard = ({ currentMonth, refreshKey, isVisible = true }: MonthlyProgressCardProps) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        percentage: 0,
        trend: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const habits = await habitService.getHabits();

                if (habits.length === 0) {
                    setStats({ percentage: 0, trend: 0 });
                    return;
                }

                const realToday = new Date();
                const isFutureMonth = currentMonth > new Date(realToday.getFullYear(), realToday.getMonth(), 1);

                if (isFutureMonth) {
                    setStats({ percentage: 0, trend: 0 });
                    return;
                }

                const isCurrentCalendarMonth =
                    realToday.getFullYear() === currentMonth.getFullYear() &&
                    realToday.getMonth() === currentMonth.getMonth();

                let viewDate = isCurrentCalendarMonth
                    ? realToday
                    : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

                const viewMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const prevMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
                const prevMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

                const logs = await logService.getLogs(prevMonthStart, viewDate);

                const toLocal = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

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

                const currentRate = getMonthRate(viewMonthStart, viewDate, logs);
                const sameDayLastMonth = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), viewDate.getDate());
                const cappedLastMonthDay = sameDayLastMonth > prevMonthEnd ? prevMonthEnd : sameDayLastMonth;
                const prevRate = getMonthRate(prevMonthStart, cappedLastMonthDay, logs);

                setStats({
                    percentage: currentRate,
                    trend: currentRate - prevRate
                });

            } catch (error) {
                console.error('MonthlyProgressCard error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentMonth, refreshKey]);

    return (
        <div className="flex flex-col h-full">
            <h3 className="mobile-section-title">Monthly Progress</h3>
            <div className="glass-card p-4 flex flex-col items-center justify-center flex-1 min-h-[220px] aspect-square">
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center animate-pulse">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
                    </div>
                ) : (
                    <>
                        <CircularProgress
                            percentage={stats.percentage}
                            size={135}
                            strokeWidth={10}
                            label="completed"
                            sublabel="this month"
                            isVisible={isVisible}
                        />
                        <div className={cn(
                            "flex items-center gap-2 mt-5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-300",
                            stats.trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                            {stats.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>
                                {Math.abs(stats.trend)}% {stats.trend >= 0 ? 'increase' : 'decrease'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
