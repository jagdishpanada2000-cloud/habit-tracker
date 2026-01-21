
import { supabase } from '@/lib/supabase';
import { habitService } from './habits';

export interface HabitLog {
    id: string;
    habit_id: string;
    user_id: string;
    completed_date: string; // YYYY-MM-DD
    created_at: string;
}

export const logService = {
    // Get logs for a specific date range
    async getLogs(startDate: Date, endDate: Date): Promise<HabitLog[]> {
        // Use local date strings to match calendar selection
        const toLocalISO = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startStr = toLocalISO(startDate);
        const endStr = toLocalISO(endDate);

        const { data, error } = await supabase
            .from('habit_logs')
            .select('*')
            .gte('completed_date', startStr)
            .lte('completed_date', endStr);

        if (error) {
            console.error('getLogs error:', error);
            throw error;
        }
        return (data || []) as HabitLog[];
    },

    // Toggle completion for a habit on a specific date
    async toggleCompletion(habitId: string, date: Date): Promise<boolean> {
        // Construct YYYY-MM-DD from local time to avoid UTC shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if exists
        const { data: existing, error: fetchError } = await supabase
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .eq('completed_date', dateStr)
            .maybeSingle();

        if (fetchError) {
            console.error('Error checking existing log:', fetchError);
            throw fetchError;
        }

        if (existing) {
            // Remove it (toggle off)
            const { error: deleteError } = await supabase
                .from('habit_logs')
                .delete()
                .eq('id', existing.id);

            if (deleteError) {
                console.error('Error deleting log:', deleteError);
                throw deleteError;
            }
            await habitService.refreshHabitStats(habitId);
            return false; // Not completed anymore
        } else {
            // Add it (toggle on)
            const { error: insertError } = await supabase
                .from('habit_logs')
                .insert({
                    habit_id: habitId,
                    user_id: user.id,
                    completed_date: dateStr
                });

            if (insertError) {
                console.error('Error inserting log:', insertError);
                throw insertError;
            }
            await habitService.refreshHabitStats(habitId);
            return true; // Completed
        }
    }
};
