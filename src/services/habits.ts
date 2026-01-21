
import { supabase } from '@/lib/supabase';
import { logService } from './logs';

export interface Habit {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    frequency: 'daily' | 'weekly';
    days_of_week: number[];
    target_days: number;
    archived: boolean;
    created_at: string;
    completed_count: number;
    missed_count: number;
    current_streak: number;
    highest_streak: number;
    highest_miss_streak: number;
    last_updated_date: string | null;
}

export interface CreateHabitDTO {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: 'daily' | 'weekly';
    days_of_week?: number[];
    target_days?: number;
}

export const habitService = {
    async getHabits(): Promise<Habit[]> {
        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('archived', false)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as Habit[];
    },

    async createHabit(habit: CreateHabitDTO): Promise<Habit> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('habits')
            .insert({
                ...habit,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        await this.refreshHabitStats(data.id);
        return data as Habit;
    },

    async updateHabit(id: string, updates: Partial<Habit>): Promise<Habit> {
        const { data, error } = await supabase
            .from('habits')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (updates.days_of_week) {
            await this.refreshHabitStats(id);
        }
        return data as Habit;
    },

    async refreshHabitStats(habitId: string): Promise<void> {
        const { data: habit, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .single();

        if (habitError || !habit) return;

        const typedHabit = habit as Habit;
        const now = new Date();
        const toLocalStr = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const todayStr = toLocalStr(now);
        
        // Fetch all logs for this habit
        const { data: logs, error: logsError } = await supabase
            .from('habit_logs')
            .select('completed_date')
            .eq('habit_id', habitId);

        if (logsError) return;

        const habitLogs = logs.map(l => l.completed_date);
        const schedule = typedHabit.days_of_week || [0, 1, 2, 3, 4, 5, 6];
        
        let completedCount = habitLogs.length;
        let missedCount = 0;
        let currentStreak = 0;

        // Calculate missed days from creation till yesterday
        const startDate = new Date(typedHabit.created_at);
        startDate.setHours(0, 0, 0, 0);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        let checkDate = new Date(startDate);
        while (checkDate <= yesterday) {
            const dateStr = toLocalStr(checkDate);
            if (schedule.includes(checkDate.getDay())) {
                if (!habitLogs.includes(dateStr)) {
                    missedCount++;
                }
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }

        // Calculate current streak
        let streakCheckDate = new Date(now);
        streakCheckDate.setHours(0, 0, 0, 0);

        // Find most recent scheduled day
        while (!schedule.includes(streakCheckDate.getDay()) && streakCheckDate >= startDate) {
            streakCheckDate.setDate(streakCheckDate.getDate() - 1);
        }

        while (streakCheckDate >= startDate) {
            const dateStr = toLocalStr(streakCheckDate);
            if (habitLogs.includes(dateStr)) {
                currentStreak++;
                // Move to previous scheduled day
                do {
                    streakCheckDate.setDate(streakCheckDate.getDate() - 1);
                } while (!schedule.includes(streakCheckDate.getDay()) && streakCheckDate >= startDate);
            } else {
                // If it's today, streak might still be alive from yesterday
                if (dateStr === todayStr) {
                    do {
                        streakCheckDate.setDate(streakCheckDate.getDate() - 1);
                    } while (!schedule.includes(streakCheckDate.getDay()) && streakCheckDate >= startDate);
                    
                    const prevDateStr = toLocalStr(streakCheckDate);
                    if (habitLogs.includes(prevDateStr)) {
                        continue; // Streak alive
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        // Calculate all-time high stats
        let highestStreak = 0;
        let runningStreak = 0;
        let highestMissStreak = 0;
        let runningMissStreak = 0;

        let scanDate = new Date(startDate);
        // Start from start date and go up to today
        while (toLocalStr(scanDate) <= todayStr) {
            const dateStr = toLocalStr(scanDate);
            if (schedule.includes(scanDate.getDay())) {
                if (habitLogs.includes(dateStr)) {
                    runningStreak++;
                    highestStreak = Math.max(highestStreak, runningStreak);
                    runningMissStreak = 0;
                } else {
                    runningStreak = 0;
                    // Only count as a miss if it's before today
                    if (dateStr !== todayStr) {
                        runningMissStreak++;
                        highestMissStreak = Math.max(highestMissStreak, runningMissStreak);
                    }
                }
            }
            scanDate.setDate(scanDate.getDate() + 1);
        }

        const { error: updateError } = await supabase
            .from('habits')
            .update({
                completed_count: completedCount,
                missed_count: missedCount,
                current_streak: currentStreak,
                highest_streak: highestStreak,
                highest_miss_streak: highestMissStreak,
                last_updated_date: todayStr
            })
            .eq('id', habitId);

        if (updateError) {
            console.error(`Error updating stats for ${habitId}:`, updateError);
        } else {
            console.log(`Updated stats for ${typedHabit.name}: HS:${highestStreak}, HMS:${highestMissStreak}`);
        }
    },

    async archiveHabit(id: string): Promise<void> {
        const { error } = await supabase
            .from('habits')
            .update({ archived: true })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteHabit(id: string): Promise<void> {
        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};