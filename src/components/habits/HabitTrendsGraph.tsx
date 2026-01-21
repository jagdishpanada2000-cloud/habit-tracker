'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    TooltipProps
} from 'recharts';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { logService } from '@/services/logs';
import { habitService } from '@/services/habits';
import { format, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

type Timeline = 'day' | 'week' | 'month';

interface DataPoint {
    label: string;
    count: number;
    isFuture: boolean;
}

interface HabitTrendsGraphProps {
    currentMonth: Date;
}

export const HabitTrendsGraph = ({ currentMonth }: HabitTrendsGraphProps) => {
    const [timeline, setTimeline] = useState<Timeline>('day');
    const [data, setData] = useState<DataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Set to true when entering, false when leaving to allow replay
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Reference date for the "center" of the 10 points
            const realToday = new Date();
            const isCurrentMonthView = currentMonth.getMonth() === realToday.getMonth() && currentMonth.getFullYear() === realToday.getFullYear();

            let referenceDate: Date;
            if (isCurrentMonthView) {
                referenceDate = realToday;
            } else {
                // For past/future months, center on the 15th
                referenceDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15);
            }

            let startDate: Date;
            let endDate: Date;
            let interval: Date[];

            if (timeline === 'day') {
                startDate = subDays(referenceDate, 5);
                endDate = addDays(referenceDate, 4);
                interval = eachDayOfInterval({ start: startDate, end: endDate }).slice(0, 10);
            } else if (timeline === 'week') {
                startDate = subWeeks(referenceDate, 5);
                endDate = addWeeks(referenceDate, 4);
                interval = eachWeekOfInterval({ start: startDate, end: endDate }).slice(0, 10);
            } else {
                startDate = subMonths(referenceDate, 5);
                endDate = addMonths(referenceDate, 4);
                interval = eachMonthOfInterval({ start: startDate, end: endDate }).slice(0, 10);
            }

            // Always fetch logs for the range
            const logs = await logService.getLogs(startDate, endDate > realToday ? realToday : endDate);

            const chartData: DataPoint[] = interval.map(date => {
                let count = 0;
                const isFuture = date > realToday && !isSameDay(date, realToday);

                if (!isFuture) {
                    if (timeline === 'day') {
                        count = logs.filter(l => isSameDay(new Date(l.completed_date), date)).length;
                    } else if (timeline === 'week') {
                        count = logs.filter(l => isSameWeek(new Date(l.completed_date), date)).length;
                    } else {
                        count = logs.filter(l => isSameMonth(new Date(l.completed_date), date)).length;
                    }
                }

                return {
                    label: timeline === 'month' ? format(date, 'MMM') : format(date, 'd'),
                    count,
                    isFuture
                };
            });

            setData(chartData);
        } catch (error) {
            console.error('Failed to load chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [timeline, currentMonth]);

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            const isFuture = payload[0].payload.isFuture;
            return (
                <div className="bg-card/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl">
                    <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 mb-1">
                        {timeline === 'month' ? 'Month' : 'Date'} {label}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full shadow-[0_0_8px_hsl(var(--primary))]",
                            isFuture ? "bg-muted-foreground/20" : "bg-primary"
                        )} />
                        <p className="text-sm font-bold text-foreground">
                            {isFuture ? 'Future' : `${payload[0].value} ${payload[0].value === 1 ? 'Habit' : 'Habits'}`}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-card p-6 border-white/5 shadow-2xl animate-fade-in relative min-h-[340px]" ref={containerRef}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Activity Trends</h2>
                    <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">Your consistency over time</p>
                </div>

                <div className="absolute top-6 right-6 z-10">
                    <Select value={timeline} onValueChange={(v) => setTimeline(v as Timeline)}>
                        <SelectTrigger className="w-[100px] rounded-xl bg-white/[0.05] border-white/5 hover:bg-white/[0.1] transition-colors h-8 text-xs backdrop-blur-md">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
                            <SelectItem value="day" className="rounded-xl text-xs">Day</SelectItem>
                            <SelectItem value="week" className="rounded-xl text-xs">Week</SelectItem>
                            <SelectItem value="month" className="rounded-xl text-xs">Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="h-[200px] w-full">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 text-sm italic">
                        Gathering trends...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ left: -64, right: 0, bottom: 0, top: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="white"
                                strokeOpacity={0.02}
                            />
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700, opacity: 0.3 }}
                                dy={10}
                                hide={false}
                                interval={0}
                                minTickGap={0}
                                padding={{ left: 64, right: 20 }}
                            />
                            <YAxis
                                hide
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                key={`trends-area-${isVisible}-${currentMonth.getTime()}-${timeline}`}
                                type="linear"
                                dataKey="count"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1}
                                fillOpacity={1}
                                fill="url(#colorCount)"
                                isAnimationActive={isVisible}
                                animationDuration={1000}
                                connectNulls
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
