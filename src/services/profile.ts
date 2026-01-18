
import { supabase } from '@/lib/supabase';

export interface Profile {
    id: string;
    is_pro: boolean;
}

export const profileService = {
    async getProfile(): Promise<Profile | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    },

    async upgradeToPro(): Promise<void> {
        // This would typically integrate with Stripe/Payment provider
        // For now, we'll simulate it by updating the DB directly (if allowed)
        // or rely on an external webhook.
        // Ideally, this calls a backend function to Create Checkout Session.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', user.id);

        if (error) throw error;
    }
};
