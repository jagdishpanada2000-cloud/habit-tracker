'use client';

import { useEffect, useState } from 'react';
import { Lock, Sparkles, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiService, AIInsight } from '@/services/ai';
import { profileService, Profile } from '@/services/profile';
export const AIInsightsCard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestInsights, setLatestInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const userProfile = await profileService.getProfile();
        setProfile(userProfile);

        if (userProfile?.is_pro) {
          const insights = await aiService.getInsights();
          setLatestInsights(insights.slice(0, 3));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pattern': return TrendingUp;
      case 'suggestion': return AlertCircle;
      case 'summary': return Calendar;
      default: return Sparkles;
    }
  };

  const isPro = profile?.is_pro;

  if (loading) return null;

  return (
    <div className="glass-card p-4 sm:p-6 relative overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold">AI Insights</h3>
        {isPro && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary ml-auto">
            Pro Active
          </span>
        )}
      </div>

      <div className="relative">
        <div className={`space-y-3 ${!isPro ? 'locked-blur' : ''}`}>
          {(isPro && latestInsights.length > 0 ? latestInsights : [
            // Mock data for blur effect only
            { type: 'pattern', title: 'Pattern Detected', content: 'Your workout completion drops 40% on Thursdays...' },
            { type: 'suggestion', title: 'Suggested Adjustment', content: 'Consider moving meditation to morning hours...' },
            { type: 'summary', title: 'Weekly Summary', content: 'You completed 73% of habits this week, up from...' }
          ]).map((insight: any, idx) => {
            const Icon = getIcon(insight.type);
            return (
              <div
                key={idx}
                className="p-4 rounded-lg bg-accent/50 border border-border/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{insight.content}</p>
              </div>
            );
          })}

          {isPro && latestInsights.length === 0 && (
            <div className="text-center p-4 text-muted-foreground text-sm">
              No insights generated yet. Visit the AI Coach tab to analyze your habits.
            </div>
          )}
        </div>

        {!isPro && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center mb-4 border border-border">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-4 px-4">
              Unlock personalized AI insights to optimize your habits
            </p>
            <Button
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={() => {
                // In a real app this might open a modal, for now navigate or toast
                // But AICoach view handles upgrades best
                document.querySelector('[data-tab="ai-coach"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                // Or just:
                // navigate('/ai-coach'); // if we had routes
              }}
            >
              Upgrade to Pro
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
