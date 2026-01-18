
import { supabase } from '@/lib/supabase';

export interface AIInsight {
    id: string;
    title: string;
    content: string;
    type: 'pattern' | 'suggestion' | 'summary' | 'general';
    created_at: string;
}

export const aiService = {
    // Fetch existing insights from the database
    async getInsights(): Promise<AIInsight[]> {
        const { data, error } = await supabase
            .from('ai_insights')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching insights:', error);
            throw error;
        }

        return data as AIInsight[];
    },

    // Trigger generation of new insights (calls Edge Function)
    async generateInsights(): Promise<void> {
        const { error } = await supabase.functions.invoke('ai-coach', {
            body: {},
        });

        if (error) {
            console.error('Error generating insights:', error);
            throw error;
        }
    }
};
