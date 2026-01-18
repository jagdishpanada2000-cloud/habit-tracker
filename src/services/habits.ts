
import { supabase } from '@/lib/supabase';

export interface Habit {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    frequency: 'daily' | 'weekly';
    target_days: number;
    archived: boolean;
    created_at: string;
}

export interface CreateHabitDTO {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: 'daily' | 'weekly';
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
        return data as Habit;
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
