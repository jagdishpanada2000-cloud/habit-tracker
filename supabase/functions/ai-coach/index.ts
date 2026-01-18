
// Follows Supabase Edge Function Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 0. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get User from Auth Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw userError || new Error('User not found');

    // 2. Check Pro Status
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    if (!profile?.is_pro) {
      return new Response(
        JSON.stringify({ error: 'AI Coach is a Premium Feature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 3. Fetch Data for Context
    const { data: habits } = await supabaseClient
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('archived', false);

    const { data: logs } = await supabaseClient
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 7 days

    // 4. Construct Prompt
    const prompt = `
      You are an AI Habit Coach. specific, actionable, and encouraging.
      Here is the user's data for the last 7 days:
      Habits: ${JSON.stringify(habits)}
      Logs: ${JSON.stringify(logs)}

      Analyze the patterns. Provide 1 specific insight in JSON format:
      {
        "title": "Short Title",
        "content": "One sentence insight.",
        "type": "pattern" | "suggestion" | "summary"
      }
    `;

    // 5. Call LLM (OpenRouter)
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    
    // Check if key is available
    if (!openRouterKey) {
        throw new Error('OpenRouter API Key not configured');
    }

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const aiData = await aiResponse.json();
    
    // Handle potential AI API errors
    if (aiData.error) {
        throw new Error(`AI Provider Error: ${aiData.error.message}`);
    }

    const cleanContent = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
    let insight;
    try {
        insight = JSON.parse(cleanContent);
    } catch (e) {
        // Fallback if AI doesn't return valid JSON
        insight = {
            title: "Weekly Insight",
            content: cleanContent,
            type: "general"
        };
    }

    // 6. Save Insight
    const { error: insertError } = await supabaseClient
      .from('ai_insights')
      .insert({
        user_id: user.id,
        title: insight.title,
        content: insight.content,
        type: insight.type || 'general'
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: 'Insight generated', insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
